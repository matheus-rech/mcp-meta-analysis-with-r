#!/usr/bin/env node

/**
 * Demonstration Workflow for MCP Meta-Analysis Server
 * Shows complete meta-analysis process with real data
 */

import { spawn } from 'child_process';

class MetaAnalysisDemo {
    constructor() {
        this.server = null;
        this.requestId = 1;
        this.responses = new Map();
        this.sessionId = null;
    }

    async run() {
        console.log('🎯 MCP Meta-Analysis Server - Complete Demo Workflow\n');
        console.log('This demo shows a complete meta-analysis of hypertension treatments\n');

        try {
            await this.startServer();
            await this.initialize();
            await this.runCompleteWorkflow();
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        } finally {
            if (this.server) {
                this.server.kill();
            }
        }
    }

    async startServer() {
        console.log('🚀 Starting MCP server...');
        
        this.server = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.server.stdout.on('data', (data) => {
            const messages = data.toString().split('\n').filter(line => line.trim());
            messages.forEach(message => {
                try {
                    const response = JSON.parse(message);
                    this.handleResponse(response);
                } catch (e) {
                    // Log non-JSON messages
                    if (message.includes('MCP Meta-Analysis Server started')) {
                        console.log('✅ Server ready\n');
                    }
                }
            });
        });

        this.server.stderr.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
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
            
            setTimeout(() => {
                if (this.responses.has(request.id)) {
                    this.responses.delete(request.id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
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
        await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: { roots: { listChanged: true }, sampling: {} },
            clientInfo: { name: 'meta-analysis-demo', version: '1.0.0' }
        });
    }

    async runCompleteWorkflow() {
        // Step 1: Initialize meta-analysis project
        console.log('📋 Step 1: Initializing meta-analysis project...');
        const initResult = await this.sendRequest('tools/call', {
            name: 'initialize_meta_analysis',
            arguments: {
                project_name: 'Hypertension Drug Efficacy Meta-Analysis',
                study_type: 'clinical_trial',
                effect_measure: 'OR',
                analysis_model: 'random'
            }
        });

        const initData = JSON.parse(initResult.content[0].text);
        this.sessionId = initData.session_id;
        console.log(`✅ Project initialized (Session: ${this.sessionId.substring(0, 8)}...)\n`);

        // Step 2: Upload comprehensive study data
        console.log('📊 Step 2: Uploading study data...');
        const studyData = `study_name,events_treatment,n_treatment,events_control,n_control
HOPE Study,120,2000,180,2000
EUROPA Trial,85,1500,125,1500
PEACE Study,95,1800,140,1800
QUIET Trial,60,1200,85,1200
CAMELOT Study,75,1400,110,1400
VALUE Study,105,1650,155,1650
ASCOT Study,90,1550,130,1550
ACCOMPLISH Trial,80,1300,115,1300`;

        const uploadResult = await this.sendRequest('tools/call', {
            name: 'upload_study_data',
            arguments: {
                session_id: this.sessionId,
                data_format: 'csv',
                data_content: studyData,
                validation_level: 'comprehensive'
            }
        });

        const uploadData = JSON.parse(uploadResult.content[0].text);
        console.log(`✅ Data uploaded: ${uploadData.studies_count} studies validated\n`);

        // Step 3: Perform meta-analysis
        console.log('🔬 Step 3: Performing meta-analysis...');
        const analysisResult = await this.sendRequest('tools/call', {
            name: 'perform_meta_analysis',
            arguments: {
                session_id: this.sessionId,
                effect_measure: 'OR',
                model_type: 'random',
                confidence_level: 0.95
            }
        });

        const analysisData = JSON.parse(analysisResult.content[0].text);
        const results = analysisData.results;
        
        console.log('✅ Meta-analysis completed:');
        console.log(`   📈 Overall OR: ${results.overall_effect.estimate.toFixed(3)} [${results.overall_effect.ci_lower.toFixed(3)}, ${results.overall_effect.ci_upper.toFixed(3)}]`);
        console.log(`   📊 p-value: ${results.overall_effect.p_value.toFixed(4)}`);
        console.log(`   🔀 I² heterogeneity: ${results.heterogeneity.i_squared.toFixed(1)}%`);
        console.log(`   🎯 Studies included: ${results.model_info.studies_included}`);
        console.log('');

        // Step 4: Generate forest plot
        console.log('🌲 Step 4: Generating forest plot...');
        const forestResult = await this.sendRequest('tools/call', {
            name: 'generate_forest_plot',
            arguments: {
                session_id: this.sessionId,
                width: 14,
                height: 10,
                dpi: 300
            }
        });
        
        const forestData = JSON.parse(forestResult.content[0].text);
        console.log(`✅ Forest plot created: ${forestData.plot_path}\n`);

        // Step 5: Assess publication bias
        console.log('📏 Step 5: Assessing publication bias...');
        const biasResult = await this.sendRequest('tools/call', {
            name: 'assess_publication_bias',
            arguments: {
                session_id: this.sessionId,
                methods: ['egger', 'begg', 'funnel']
            }
        });

        const biasData = JSON.parse(biasResult.content[0].text);
        console.log('✅ Publication bias assessment:');
        
        if (biasData.results.egger_test) {
            console.log(`   🎯 Egger's test: p = ${biasData.results.egger_test.p_value.toFixed(4)} (${biasData.results.egger_test.interpretation})`);
        }
        
        if (biasData.results.begg_test) {
            console.log(`   📊 Begg's test: p = ${biasData.results.begg_test.p_value.toFixed(4)} (${biasData.results.begg_test.interpretation})`);
        }
        
        if (biasData.results.funnel_plot) {
            console.log(`   📈 Funnel plot: ${biasData.results.funnel_plot.plot_path}`);
        }
        console.log('');

        // Step 6: Generate comprehensive report
        console.log('📝 Step 6: Generating comprehensive report...');
        const reportResult = await this.sendRequest('tools/call', {
            name: 'generate_report',
            arguments: {
                session_id: this.sessionId,
                format: 'html',
                include_plots: true,
                include_code: true
            }
        });

        const reportData = JSON.parse(reportResult.content[0].text);
        console.log(`✅ Report generated: ${reportData.report_path}\n`);

        // Summary
        console.log('🎉 Demo Workflow Complete!\n');
        console.log('📋 Summary of Results:');
        console.log(`   • Effect: OR = ${results.overall_effect.estimate.toFixed(3)} [${results.overall_effect.ci_lower.toFixed(3)}, ${results.overall_effect.ci_upper.toFixed(3)}]`);
        console.log(`   • Significance: p = ${results.overall_effect.p_value.toFixed(4)} ${results.overall_effect.p_value < 0.05 ? '(Significant)' : '(Not significant)'}`);
        console.log(`   • Heterogeneity: I² = ${results.heterogeneity.i_squared.toFixed(1)}% ${results.heterogeneity.i_squared > 50 ? '(High)' : '(Low to moderate)'}`);
        console.log(`   • Publication bias: ${biasData.results.egger_test ? (biasData.results.egger_test.p_value > 0.05 ? 'No evidence' : 'Evidence detected') : 'Not assessed'}`);
        console.log('\n📁 Generated Files:');
        console.log(`   • Forest plot: ${forestData.plot_path}`);
        console.log(`   • Funnel plot: ${biasData.results.funnel_plot ? biasData.results.funnel_plot.plot_path : 'Not generated'}`);
        console.log(`   • HTML report: ${reportData.report_path}`);
        console.log('\n🎯 Clinical Interpretation:');
        
        if (results.overall_effect.estimate < 1 && results.overall_effect.p_value < 0.05) {
            console.log('   The intervention shows a statistically significant protective effect.');
        } else if (results.overall_effect.estimate > 1 && results.overall_effect.p_value < 0.05) {
            console.log('   The intervention shows a statistically significant harmful effect.');
        } else {
            console.log('   No statistically significant effect was detected.');
        }
        
        if (results.heterogeneity.i_squared > 50) {
            console.log('   ⚠️  High heterogeneity suggests studies differ substantially - consider subgroup analysis.');
        }
        
        console.log('\n✨ The MCP Meta-Analysis Server successfully completed a full workflow!');
    }
}

// Run the demo
const demo = new MetaAnalysisDemo();
demo.run().catch(console.error);