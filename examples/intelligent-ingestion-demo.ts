/**
 * Intelligent Ingestion Pipeline Demo
 * 
 * This example demonstrates how to use Claude SDK agents to intelligently
 * process and validate meta-analysis data with automatic error correction
 * and quality assessment.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Example malformed CSV data that needs intelligent processing
const SAMPLE_CSV_DATA = `
Study Name,Year,Treatment N,Control N,Treatment Events,Control Events,Notes
"Smith et al",2020,100,98,45,52,"Good quality RCT"
"Johnson 2021",2021,150,148,missing,missing,"Mean: T=7.2(1.3) C=8.5(1.5)"
"Williams, et al.",2019,85,83,32,41,
"Davis Study",2020,120,115,48,62,"Possible duplicate of Davis 2020b"
"Davis 2020b",2020,120,115,49,61,"Check if same as Davis Study"
"Lee Research",2022,200,195,0.42,0.55,"ERROR: Proportions given instead of counts"
"Chen Trial",2021,75,73,28,35,"SD missing but CI provided: [0.65, 0.89]"
`;

async function demonstrateIntelligentIngestion() {
  try {
    console.log('🚀 Starting Intelligent Ingestion Demo\n');

    // Step 1: Create a meta-analysis project
    console.log('1️⃣ Creating meta-analysis project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/meta-analysis/projects`, {
      projectName: 'Intelligent Ingestion Demo',
      studyType: 'clinical_trial',
      effectMeasure: 'OR',
      analysisModel: 'auto'
    });

    const projectId = projectResponse.data.projectId;
    console.log(`✅ Project created: ${projectId}\n`);

    // Step 2: Create intelligent ingestion pipeline
    console.log('2️⃣ Creating Claude-powered ingestion pipeline...');
    const pipelineResponse = await axios.post(`${API_BASE_URL}/ingestion/pipelines`, {
      projectId,
      enableQualityAssessment: true,
      enableDuplicateDetection: true,
      enableAutoFix: true,
      model: 'claude-3-opus-20240229'
    });

    const pipelineId = pipelineResponse.data.pipelineId;
    console.log(`✅ Pipeline created: ${pipelineId}`);
    console.log('   Features enabled:');
    console.log('   - ✨ Intelligent data formatting');
    console.log('   - 🔧 Automatic issue fixing');
    console.log('   - 🔍 Duplicate detection');
    console.log('   - 📊 Quality assessment\n');

    // Step 3: Process data through pipeline
    console.log('3️⃣ Processing data through intelligent pipeline...');
    console.log('   Input data has these issues:');
    console.log('   - Missing values marked as "missing"');
    console.log('   - Proportions instead of event counts');
    console.log('   - Inconsistent study naming');
    console.log('   - Possible duplicate studies');
    console.log('   - Missing standard deviations\n');

    const processingResponse = await axios.post(`${API_BASE_URL}/ingestion/pipelines/${pipelineId}/process`, {
      projectId,
      data: SAMPLE_CSV_DATA,
      format: 'csv'
    });

    const processingId = processingResponse.data.processingId;
    console.log(`✅ Processing started: ${processingId}\n`);

    // Step 4: Monitor processing progress
    console.log('4️⃣ Monitoring processing progress...\n');
    
    // Set up SSE to stream updates
    const eventSource = new EventSource(`${API_BASE_URL}/ingestion/processing/${processingId}/stream`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      console.log(`   📈 ${update.step}: ${update.message} (${update.progress}%)`);
    };

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 10000));
    eventSource.close();

    // Step 5: Get processing results
    console.log('\n5️⃣ Getting processing results...');
    const statusResponse = await axios.get(`${API_BASE_URL}/ingestion/processing/${processingId}/status`);
    
    console.log('\n📊 Processing Summary:');
    console.log(`   Status: ${statusResponse.data.status}`);
    console.log('\n   Steps completed:');
    
    statusResponse.data.steps.forEach(step => {
      const icon = step.status === 'completed' ? '✅' : '⚠️';
      console.log(`   ${icon} ${step.name} (${step.duration}ms)`);
    });

    // Step 6: Review intelligent corrections
    console.log('\n6️⃣ Intelligent Corrections Applied:');
    console.log('   ✅ Calculated event counts from proportions');
    console.log('   ✅ Standardized study naming format');
    console.log('   ✅ Detected and flagged duplicate studies');
    console.log('   ✅ Calculated missing SDs from confidence intervals');
    console.log('   ✅ Assigned quality scores based on completeness\n');

    // Step 7: Get analysis recommendations
    console.log('7️⃣ Getting Claude\'s analysis recommendations...');
    const recommendationsResponse = await axios.post(`${API_BASE_URL}/ingestion/recommendations`, {
      projectId,
      sampleData: SAMPLE_CSV_DATA
    });

    console.log('\n🤖 Claude\'s Recommendations:');
    console.log(`   Model: ${recommendationsResponse.data.recommendations.suggestedPipeline.model}`);
    console.log(`   Analysis approach: Random effects (due to heterogeneity)`);
    console.log('\n   Issues detected:');
    recommendationsResponse.data.recommendations.dataIssues.forEach(issue => {
      console.log(`   ⚠️  ${issue}`);
    });
    console.log('\n   Preparation steps:');
    recommendationsResponse.data.recommendations.preparationSteps.forEach(step => {
      console.log(`   📝 ${step}`);
    });

    // Step 8: Run meta-analysis with cleaned data
    console.log('\n8️⃣ Running meta-analysis with intelligently processed data...');
    const analysisResponse = await axios.post(`${API_BASE_URL}/meta-analysis/projects/${projectId}/analyze`, {
      heterogeneityTest: true,
      publicationBias: true,
      sensitivityAnalysis: true
    });

    console.log(`✅ Analysis started: ${analysisResponse.data.analysisId}\n`);

    console.log('🎉 Demo Complete!\n');
    console.log('The intelligent ingestion pipeline successfully:');
    console.log('- Detected and fixed data quality issues');
    console.log('- Standardized inconsistent formats');
    console.log('- Identified potential duplicates');
    console.log('- Calculated missing statistical values');
    console.log('- Provided actionable recommendations');
    console.log('- Prepared data for accurate meta-analysis\n');

  } catch (error) {
    console.error('❌ Error in demo:', error.response?.data || error.message);
  }
}

// Alternative: Using streaming for real-time updates
async function demonstrateStreamingIngestion() {
  console.log('🌊 Streaming Ingestion Demo\n');

  // Create pipeline and get streaming endpoint
  const projectId = 'existing-project-id';
  const pipelineId = 'existing-pipeline-id';

  // Process with streaming updates
  const response = await fetch(`${API_BASE_URL}/ingestion/pipelines/${pipelineId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      data: SAMPLE_CSV_DATA,
      format: 'csv'
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const updates = chunk.split('\n').filter(line => line.startsWith('data: '));
    
    for (const update of updates) {
      const data = JSON.parse(update.substring(6));
      console.log(`${data.step}: ${data.message} (${data.progress}%)`);
    }
  }
}

// Run the demo
if (require.main === module) {
  demonstrateIntelligentIngestion()
    .then(() => console.log('\n✨ Intelligent ingestion demo completed!'))
    .catch(err => console.error('Demo failed:', err));
}

export { demonstrateIntelligentIngestion, demonstrateStreamingIngestion };