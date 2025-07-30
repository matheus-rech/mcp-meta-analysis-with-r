#!/usr/bin/env node

/**
 * Simple MCP Server Test
 * Tests individual components of the meta-analysis server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
    console.log('🚀 Testing MCP Meta-Analysis Server Components\n');

    // Test 1: Check if server can start
    console.log('1️⃣ Testing server startup...');
    
    const server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
    });

    let serverStarted = false;
    let serverOutput = '';

    server.stdout.on('data', (data) => {
        serverOutput += data.toString();
        if (data.toString().includes('MCP Meta-Analysis Server started')) {
            serverStarted = true;
            console.log('✅ Server started successfully');
        }
    });

    server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
    });

    // Wait for server to start
    await new Promise((resolve) => {
        setTimeout(() => {
            if (serverStarted) {
                console.log('✅ Server is ready for connections\n');
            } else {
                console.log('⚠️  Server may have issues, but continuing tests...\n');
            }
            resolve();
        }, 2000);
    });

    // Test 2: Send MCP initialize request
    console.log('2️⃣ Testing MCP initialization...');
    
    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: { listChanged: true },
                sampling: {}
            },
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    };

    server.stdin.write(JSON.stringify(initRequest) + '\n');

    // Test 3: List available tools
    setTimeout(() => {
        console.log('3️⃣ Testing tools listing...');
        const listToolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        };
        server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    }, 1000);

    // Test 4: Try initializing a meta-analysis session
    setTimeout(() => {
        console.log('4️⃣ Testing meta-analysis initialization...');
        const initAnalysisRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'initialize_meta_analysis',
                arguments: {
                    project_name: 'Test Analysis',
                    study_type: 'clinical_trial',
                    effect_measure: 'OR',
                    analysis_model: 'random'
                }
            }
        };
        server.stdin.write(JSON.stringify(initAnalysisRequest) + '\n');
    }, 2000);

    // Listen for responses
    let responseCount = 0;
    server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                responseCount++;
                
                if (response.id === 1) {
                    console.log('✅ MCP initialization response received');
                    if (response.result && response.result.capabilities) {
                        console.log('   📋 Server capabilities confirmed');
                    }
                } else if (response.id === 2) {
                    console.log('✅ Tools list response received');
                    if (response.result && response.result.tools) {
                        const toolNames = response.result.tools.map(t => t.name);
                        console.log('   🛠️  Available tools:', toolNames.join(', '));
                    }
                } else if (response.id === 3) {
                    console.log('✅ Meta-analysis initialization response received');
                    if (response.result) {
                        console.log('   📊 Session created successfully');
                    } else if (response.error) {
                        console.log('   ⚠️  Error:', response.error.message);
                    }
                }
            } catch (e) {
                // Ignore non-JSON lines (they might be log messages)
            }
        });
    });

    // Clean up after tests
    setTimeout(() => {
        console.log('\n🧹 Cleaning up test...');
        server.kill();
        
        console.log('\n📋 Test Summary:');
        console.log(`   • Server startup: ${serverStarted ? '✅' : '❌'}`);
        console.log(`   • MCP responses: ${responseCount} received`);
        console.log('\n✅ MCP Server test completed!\n');
        
        // Additional component tests
        testRIntegration();
    }, 5000);
}

async function testRIntegration() {
    console.log('🔬 Testing R Integration...\n');
    
    // Test R script execution
    const testR = spawn('R', ['--vanilla', '--slave'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    testR.stdin.write(`
# Test meta-analysis packages
packages <- c("meta", "metafor", "dplyr", "jsonlite", "ggplot2")
available_packages <- sapply(packages, function(pkg) {
    suppressWarnings(require(pkg, character.only = TRUE, quietly = TRUE))
})

cat("Package availability:\\n")
for (i in 1:length(packages)) {
    cat(sprintf("%s: %s\\n", packages[i], ifelse(available_packages[i], "✅", "❌")))
}

# Test simple meta-analysis
if (all(available_packages[1:2])) {
    cat("\\nTesting meta-analysis calculation...\\n")
    
    # Simple test data
    events_t <- c(15, 20, 8)
    n_t <- c(100, 80, 50)
    events_c <- c(25, 30, 12)
    n_c <- c(100, 85, 55)
    
    tryCatch({
        ma_result <- metabin(events_t, n_t, events_c, n_c, 
                            studlab = paste("Study", 1:3),
                            method = "Inverse", sm = "OR")
        cat(sprintf("Meta-analysis OR: %.3f [%.3f, %.3f]\\n", 
                   exp(ma_result$TE.random), 
                   exp(ma_result$lower.random), 
                   exp(ma_result$upper.random)))
        cat("✅ R integration working correctly\\n")
    }, error = function(e) {
        cat("❌ R meta-analysis test failed:", e$message, "\\n")
    })
} else {
    cat("❌ Required R packages not available\\n")
}

quit(save = "no")
`);
    
    testR.stdin.end();
    
    testR.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    
    testR.stderr.on('data', (data) => {
        console.error('R Error:', data.toString());
    });
    
    testR.on('close', (code) => {
        console.log('\n✅ R integration test completed\n');
    });
}

// Run the tests
testMCPServer().catch(console.error);