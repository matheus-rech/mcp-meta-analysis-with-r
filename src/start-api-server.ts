#!/usr/bin/env node
import { APIGateway } from './api/app.js';
import { MetaAnalysisMCPServer } from './index.js';
import { logger } from './logger.js';

// Configuration
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);
const ENABLE_MCP = process.env.ENABLE_MCP !== 'false';

async function startServers() {
  try {
    // Start API Gateway
    logger.info('Starting API Gateway...');
    const apiGateway = new APIGateway(API_PORT);
    apiGateway.start();

    // Start MCP Server if enabled
    if (ENABLE_MCP) {
      logger.info('Starting MCP Server...');
      const mcpServer = new MetaAnalysisMCPServer();
      await mcpServer.run();
    }

    logger.info('All servers started successfully');
    logger.info(`API Gateway: http://localhost:${API_PORT}`);
    logger.info(`API Documentation: http://localhost:${API_PORT}/api-docs`);
    
    if (ENABLE_MCP) {
      logger.info('MCP Server: Running on stdio transport');
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start servers:', error);
    process.exit(1);
  }
}

// Start the servers
startServers();