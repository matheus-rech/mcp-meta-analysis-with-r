#!/usr/bin/env node

/**
 * Simple MCP Client Test Script
 * Tests the meta-analysis MCP server functionality
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class MCPClient {
    constructor() {
        this.server = null;
        this.requestId = 1;
        this.responses = new Map();
    }

    async start() {
        console.log('🚀 Starting MCP Meta-Analysis Server Test...\n');

        // Start the MCP server
        this.server = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd()
        });

        // Handle server output
        this.server.stdout.on('data', (data) => {
            const messages = data.toString().split('\n').filter(line => line.trim());
            messages.forEach(message => {
                if (message.trim()) {
                    try {
                        const response = JSON.parse(message);
                        this.handleResponse(response);
                    } catch (e) {
                        console.log('Server log:', message);
                    }
                }
            });
        });

        this.server.stderr.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        // Initialize connection
        await this.initialize();
        
        // Run tests
        await this.runTests();
        
        // Cleanup
        this.server.kill();
        console.log('\n✅ MCP Server test completed successfully!\n');
    }

    async sendRequest(method, params = {}) {
        const request = {
            jsonrpc: '2.0',
            id: this.requestId++,
            method,
            params
        };

        return new Promise((resolve, reject) => {
            this.responses.set(request.id, { resolve, reject });
            this.server.stdin.write(JSON.stringify(request) + '\n');
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.responses.has(request.id)) {
                    this.responses.delete(request.id);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    handleResponse(response) {
        if (response.id && this.responses.has(response.id)) {
            const { resolve, reject } = this.responses.get(response.id);
            this.responses.delete(response.id);
            
            if (response.error) {
                reject(new Error(response.error.message || 'Unknown error'));
            } else {
                resolve(response.result);
            }
        }
    }

    async initialize() {
        console.log('📡 Initializing MCP connection...');
        
        const initResult = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: {
                    listChanged: true
                },
                sampling: {}
            },
            clientInfo: {
                name: 'meta-analysis-test-client',
                version: '1.0.0'
            }
        });

        console.log('✅ MCP Server initialized');
        console.log('📋 Available tools:', initResult.capabilities.tools.map(t => t.name).join(', '));
        console.log('');
    }

    async runTests() {
        try {
            // Test 1: Initialize meta-analysis session
            console.log('🧪 Test 1: Initialize meta-analysis session');
            const initSession = await this.sendRequest('tools/call', {
                name: 'initialize_meta_analysis',
                arguments: {
                    project_name: 'Test Meta-Analysis',
                    research_question: 'Effect of intervention X on outcome Y',
                    effect_measure: 'OR',
                    study_type: 'clinical_trial'
                }
            });
            console.log('✅ Session initialized:', initSession.content[0].text);
            const sessionData = JSON.parse(initSession.content[0].text);
            const sessionId = sessionData.session_id;
            console.log('');

            // Test 2: Upload sample study data
            console.log('🧪 Test 2: Upload study data');
            const sampleData = `study_name,events_treatment,n_treatment,events_control,n_control
Study A,15,100,25,100
Study B,20,80,30,85
Study C,8,50,12,55`;

            const uploadResult = await this.sendRequest('tools/call', {
                name: 'upload_study_data',
                arguments: {
                    session_id: sessionId,
                    data_format: 'csv',
                    data_content: sampleData,
                    validation_level: 'comprehensive'
                }
            });
            console.log('✅ Data uploaded and validated:', JSON.parse(uploadResult.content[0].text).message);
            console.log('');

            // Test 3: Perform meta-analysis
            console.log('🧪 Test 3: Perform meta-analysis');
            const analysisResult = await this.sendRequest('tools/call', {
                name: 'perform_meta_analysis',
                arguments: {
                    session_id: sessionId,
                    effect_measure: 'OR',
                    model_type: 'random',
                    confidence_level: 0.95
                }
            });
            
            const analysisData = JSON.parse(analysisResult.content[0].text);
            console.log('✅ Meta-analysis completed');
            console.log(`   📊 Overall OR: ${analysisData.results.overall_effect.estimate.toFixed(3)} [${analysisData.results.overall_effect.ci_lower.toFixed(3)}, ${analysisData.results.overall_effect.ci_upper.toFixed(3)}]`);
            console.log(`   📈 I² = ${analysisData.results.heterogeneity.i_squared.toFixed(1)}%, p = ${analysisData.results.overall_effect.p_value.toFixed(4)}`);
            console.log('');

            // Test 4: Generate forest plot
            console.log('🧪 Test 4: Generate forest plot');
            const forestResult = await this.sendRequest('tools/call', {
                name: 'generate_forest_plot',
                arguments: {
                    session_id: sessionId,
                    width: 12,
                    height: 8,
                    dpi: 300
                }
            });
            console.log('✅ Forest plot generated:', JSON.parse(forestResult.content[0].text).message);
            console.log('');

            // Test 5: Generate report
            console.log('🧪 Test 5: Generate comprehensive report');
            const reportResult = await this.sendRequest('tools/call', {
                name: 'generate_report',
                arguments: {
                    session_id: sessionId,
                    format: 'html',
                    include_plots: true,
                    include_code: true
                }
            });
            console.log('✅ Report generated:', JSON.parse(reportResult.content[0].text).message);
            console.log('');

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
}

// Run the test
const client = new MCPClient();
client.start().catch(console.error);