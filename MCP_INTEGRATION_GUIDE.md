# MCP Integration Guide

## 🎯 MCP Meta-Analysis Server Integration Guide

This guide shows how to integrate the MCP Meta-Analysis Server with various MCP clients.

## 📋 Integration Status

✅ **Server Testing**: Complete - All 8 tools functional  
✅ **MCP Protocol**: Complete - Server responds correctly to MCP requests  
✅ **R Integration**: Complete - Statistical analysis working  
✅ **Plot Generation**: Complete - Forest and funnel plots generated  
✅ **Claude Desktop**: Ready - Configuration files created  

## 🔧 Client Configurations

### Claude Desktop

**Configuration Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "meta-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/your/mcp-meta-analysis-with-r",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### VS Code with MCP Extension

```json
{
  "mcp.servers": {
    "meta-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/your/mcp-meta-analysis-with-r"
    }
  }
}
```

### Custom MCP Client

```javascript
import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/path/to/mcp-meta-analysis-with-r'
});

// Send MCP initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: { roots: { listChanged: true } },
    clientInfo: { name: 'your-client', version: '1.0.0' }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');
```

## 🛠️ Available Tools

The server exposes 8 MCP tools:

1. **initialize_meta_analysis** - Start new project
2. **upload_study_data** - Upload and validate data  
3. **perform_meta_analysis** - Execute analysis
4. **generate_forest_plot** - Create forest plots
5. **assess_publication_bias** - Test for bias
6. **generate_report** - Generate reports
7. **list_sessions** - View sessions
8. **get_session_status** - Check status

## 🧪 Testing Results

### MCP Server Test Results
```
✅ Server startup: SUCCESS
✅ MCP initialization: SUCCESS  
✅ Tools listing: SUCCESS (8 tools available)
✅ Meta-analysis session: SUCCESS
✅ MCP responses: 3 received
```

### R Integration Test Results
```
✅ meta package: Available
✅ metafor package: Available
✅ dplyr package: Available
✅ jsonlite package: Available
✅ ggplot2 package: Available
✅ Meta-analysis calculation: OR = 0.591 [0.381, 0.917]
```

## 📊 Example Workflows

### Basic Meta-Analysis

```
1. Initialize project: "Blood pressure medication efficacy"
2. Upload CSV data with treatment/control events
3. Run random-effects meta-analysis  
4. Generate forest plot (12x8 inches, 300 DPI)
5. Assess publication bias (Egger's + Begg's tests)
6. Generate HTML report with plots and code
```

### Advanced Analysis

```
1. Initialize with specific effect measure (OR/RR/MD/SMD/HR)
2. Upload data with comprehensive validation
3. Run analysis with heterogeneity assessment
4. Generate publication-ready visualizations
5. Perform sensitivity analysis
6. Export results in multiple formats
```

## 🔍 Troubleshooting

### Common Integration Issues

1. **Server not starting**
   - Check Node.js version (>=18.0.0)
   - Verify path to dist/index.js
   - Check permissions on working directory

2. **R packages missing**
   ```bash
   R -e "install.packages(c('meta', 'metafor', 'dplyr', 'jsonlite', 'ggplot2'))"
   ```

3. **MCP protocol errors**
   - Ensure JSON-RPC 2.0 format
   - Check method names and parameters
   - Verify MCP version compatibility (2024-11-05)

4. **Session management issues**
   - Sessions are stored in user_sessions/
   - Each session has unique UUID
   - Sessions persist across server restarts

### Debug Mode

Enable detailed logging:

```json
{
  "mcpServers": {
    "meta-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/project",
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## 📈 Performance Optimization

### For Large Datasets
- Use streaming data upload for >1000 studies
- Enable R memory optimization
- Consider batch processing for multiple analyses

### For Multiple Sessions
- Configure session cleanup interval
- Monitor disk space in user_sessions/
- Implement session archiving for completed analyses

## 🔒 Security Considerations

### Session Isolation
- Each session has unique UUID
- No cross-session data access
- Sessions stored in isolated directories

### Input Validation
- All data validated against schemas
- Statistical parameters checked for validity
- File uploads sanitized and validated

### R Execution Safety
- R scripts run in controlled environment
- No system() or dangerous R functions allowed
- Output files sandboxed to session directories

## 🚀 Next Steps

1. **Deploy to production**: Configure with proper environment variables
2. **Scale horizontally**: Use load balancer for multiple server instances
3. **Add authentication**: Implement user authentication if needed
4. **Monitor performance**: Set up logging and monitoring
5. **Extend functionality**: Add more statistical methods as needed

## 📞 Support

For integration support:
- Check server logs: `user_sessions/[session_id]/logs/`
- Review R console output for statistical errors  
- Verify MCP protocol compatibility
- Test with simple-mcp-test.js for debugging

---

**Integration Status**: ✅ Ready for Production Use  
**Last Tested**: July 30, 2025  
**MCP Protocol Version**: 2024-11-05