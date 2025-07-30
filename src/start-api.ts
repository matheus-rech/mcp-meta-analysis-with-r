#!/usr/bin/env node

import { APIGateway } from './api/app.js';
import { MetaAnalysisMCPServer } from './index.js';
import { logger } from './logger.js';

// Configuration
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);
const ENABLE_MCP = process.env.ENABLE_MCP === 'true';

async function startServers() {
  try {
    logger.info('Starting Meta-Analysis Services...');

    // Start API Gateway
    const apiGateway = new APIGateway(API_PORT);
    apiGateway.start();

    // Optionally start MCP server alongside API
    if (ENABLE_MCP) {
      logger.info('Starting MCP server in parallel with API...');
      const mcpServer = new MetaAnalysisMCPServer();
      
      // Run MCP server in background
      mcpServer.run().catch(error => {
        logger.error('MCP server error:', error);
      });
    }

    // Setup graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    logger.info('All services started successfully');
    logger.info(`API Gateway: http://localhost:${API_PORT}`);
    logger.info(`API Docs: http://localhost:${API_PORT}/api-docs`);
    logger.info(`Health Check: http://localhost:${API_PORT}/health`);
    
    if (ENABLE_MCP) {
      logger.info('MCP Server: Running on stdio');
    }

  } catch (error) {
    logger.error('Failed to start services:', error);
    process.exit(1);
  }
}

function shutdown() {
  logger.info('Shutting down services...');
  process.exit(0);
}

// Start the servers
startServers();