// MCP (Model Context Protocol) 서비스 구현
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MongoClient, Db } from 'mongodb';
import logger from '../config/logger';
import { DATABASE_CONFIG } from '../config/env';

export class MCPService {
  private server: Server;
  private mongoClient: MongoClient | null = null;
  private db: Db | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'tft-meta-analyzer-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 사용 가능한 도구 목록 제공
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'mongodb_query',
            description: 'Execute MongoDB queries with natural language',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language description of the query you want to execute',
                },
                collection: {
                  type: 'string',
                  description: 'MongoDB collection name (optional)',
                },
                operation: {
                  type: 'string',
                  enum: ['find', 'aggregate', 'count', 'distinct', 'schema'],
                  description: 'Type of operation to perform',
                },
              },
              required: ['query', 'operation'],
            },
          },
          {
            name: 'database_stats',
            description: 'Get database statistics and performance metrics',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['overview', 'collections', 'indexes', 'performance'],
                  description: 'Type of statistics to retrieve',
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'analyze_performance',
            description: 'Analyze database performance and suggest optimizations',
            inputSchema: {
              type: 'object',
              properties: {
                collection: {
                  type: 'string',
                  description: 'Collection to analyze (optional)',
                },
                timeRange: {
                  type: 'string',
                  description: 'Time range for analysis (e.g., "1h", "24h", "7d")',
                },
              },
            },
          },
          {
            name: 'explain_query',
            description: 'Explain query execution plan and suggest optimizations',
            inputSchema: {
              type: 'object',
              properties: {
                collection: {
                  type: 'string',
                  description: 'Collection name',
                },
                query: {
                  type: 'object',
                  description: 'MongoDB query to explain',
                },
              },
              required: ['collection', 'query'],
            },
          },
        ],
      };
    });

    // 도구 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureConnection();

        switch (name) {
          case 'mongodb_query':
            return await this.handleMongoDBQuery(args);
          case 'database_stats':
            return await this.handleDatabaseStats(args);
          case 'analyze_performance':
            return await this.handleAnalyzePerformance(args);
          case 'explain_query':
            return await this.handleExplainQuery(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('MCP tool execution error', { tool: name, error });
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private async ensureConnection(): Promise<void> {
    if (!this.mongoClient) {
      const uri = DATABASE_CONFIG.MONGODB_URI;
      if (!uri) {
        throw new Error('MongoDB URI not configured');
      }

      this.mongoClient = new MongoClient(uri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db();
      logger.info('MCP MongoDB connection established');
    }
  }

  private async handleMongoDBQuery(args: any): Promise<any> {
    const { query, collection, operation } = args;
    
    if (!this.db) {
      throw new Error('Database not connected');
    }

    let result;
    
    switch (operation) {
      case 'find':
        if (!collection) {
          throw new Error('Collection name required for find operation');
        }
        
        // 자연어 쿼리를 MongoDB 쿼리로 변환하는 간단한 로직
        const mongoQuery = this.parseNaturalLanguageQuery(query);
        result = await this.db.collection(collection).find(mongoQuery).limit(10).toArray();
        break;
        
      case 'count':
        if (!collection) {
          throw new Error('Collection name required for count operation');
        }
        
        const countQuery = this.parseNaturalLanguageQuery(query);
        result = await this.db.collection(collection).countDocuments(countQuery);
        break;
        
      case 'aggregate':
        if (!collection) {
          throw new Error('Collection name required for aggregate operation');
        }
        
        const pipeline = this.parseAggregationQuery(query);
        result = await this.db.collection(collection).aggregate(pipeline).toArray();
        break;
        
      case 'distinct':
        if (!collection) {
          throw new Error('Collection name required for distinct operation');
        }
        
        const field = this.extractFieldFromQuery(query);
        result = await this.db.collection(collection).distinct(field);
        break;
        
      case 'schema':
        if (!collection) {
          throw new Error('Collection name required for schema operation');
        }
        
        result = await this.analyzeSchema(collection);
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: query,
            collection: collection,
            operation: operation,
            result: result,
            count: Array.isArray(result) ? result.length : 1,
          }, null, 2),
        },
      ],
    };
  }

  private async handleDatabaseStats(args: any): Promise<any> {
    const { type } = args;
    
    if (!this.db) {
      throw new Error('Database not connected');
    }

    let result;
    
    switch (type) {
      case 'overview':
        result = await this.db.stats();
        break;
        
      case 'collections':
        const collections = await this.db.listCollections().toArray();
        result = collections.map(col => ({
          name: col.name,
          type: col.type,
          options: col.options,
        }));
        break;
        
      case 'indexes':
        const collectionsForIndexes = await this.db.listCollections().toArray();
        result = {};
        
        for (const col of collectionsForIndexes) {
          const indexes = await this.db.collection(col.name).indexes();
          result[col.name] = indexes;
        }
        break;
        
      case 'performance':
        result = await this.getPerformanceMetrics();
        break;
        
      default:
        throw new Error(`Unsupported stats type: ${type}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            type: type,
            timestamp: new Date().toISOString(),
            result: result,
          }, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzePerformance(args: any): Promise<any> {
    const { collection, timeRange } = args;
    
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      collection: collection,
      timeRange: timeRange,
      recommendations: [],
      metrics: {},
    };

    // 컬렉션별 성능 분석
    if (collection) {
      const col = this.db.collection(collection);
      const stats = await col.stats();
      const indexes = await col.indexes();
      
      analysis.metrics = {
        documentCount: stats.count,
        averageObjectSize: stats.avgObjSize,
        totalIndexSize: stats.totalIndexSize,
        indexCount: indexes.length,
      };
      
      // 권장사항 생성
      if (stats.count > 10000 && indexes.length < 3) {
        analysis.recommendations.push('Consider adding more indexes for better query performance');
      }
      
      if (stats.avgObjSize > 1024 * 1024) {
        analysis.recommendations.push('Large documents detected. Consider document structure optimization');
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async handleExplainQuery(args: any): Promise<any> {
    const { collection, query } = args;
    
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const col = this.db.collection(collection);
    const explanation = await col.find(query).explain('executionStats');
    
    const analysis = {
      query: query,
      collection: collection,
      executionStats: explanation.executionStats,
      recommendations: [],
    };
    
    // 성능 분석 및 권장사항
    if (explanation.executionStats.executionTimeMillis > 100) {
      analysis.recommendations.push('Query execution time is high. Consider adding appropriate indexes');
    }
    
    if (explanation.executionStats.totalDocsExamined > explanation.executionStats.totalDocsReturned * 10) {
      analysis.recommendations.push('Query is examining too many documents. Optimize query conditions or add indexes');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  // 메서드를 public으로 노출 (라우터에서 사용)
  async executeMongoDBQuery(args: any): Promise<any> {
    return this.handleMongoDBQuery(args);
  }

  async getDatabaseStats(args: any): Promise<any> {
    return this.handleDatabaseStats(args);
  }

  async analyzePerformance(args: any): Promise<any> {
    return this.handleAnalyzePerformance(args);
  }

  async explainQuery(args: any): Promise<any> {
    return this.handleExplainQuery(args);
  }

  // 유틸리티 메서드들
  private parseNaturalLanguageQuery(query: string): any {
    // 간단한 자연어 쿼리 파싱 로직
    // 실제 구현에서는 더 정교한 NLP 처리 필요
    
    const lowerQuery = query.toLowerCase();
    const mongoQuery: any = {};
    
    // 기본적인 패턴 매칭
    if (lowerQuery.includes('recent') || lowerQuery.includes('last')) {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      mongoQuery.createdAt = { $gte: dayAgo };
    }
    
    if (lowerQuery.includes('high') && lowerQuery.includes('rank')) {
      mongoQuery.tier = { $in: ['DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'] };
    }
    
    if (lowerQuery.includes('error') || lowerQuery.includes('failed')) {
      mongoQuery.status = 'error';
    }
    
    return mongoQuery;
  }

  private parseAggregationQuery(query: string): any[] {
    // 간단한 집계 쿼리 파싱
    const lowerQuery = query.toLowerCase();
    const pipeline: any[] = [];
    
    if (lowerQuery.includes('group by') || lowerQuery.includes('count by')) {
      pipeline.push({
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
        },
      });
    }
    
    if (lowerQuery.includes('sort') || lowerQuery.includes('order')) {
      pipeline.push({
        $sort: { count: -1 },
      });
    }
    
    return pipeline.length > 0 ? pipeline : [{ $limit: 10 }];
  }

  private extractFieldFromQuery(query: string): string {
    // 쿼리에서 필드명 추출
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('tier') || lowerQuery.includes('rank')) {
      return 'tier';
    }
    
    if (lowerQuery.includes('region')) {
      return 'region';
    }
    
    if (lowerQuery.includes('champion')) {
      return 'championName';
    }
    
    return '_id'; // 기본값
  }

  private async analyzeSchema(collection: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const col = this.db.collection(collection);
    const sample = await col.findOne();
    
    if (!sample) {
      return { message: 'Collection is empty' };
    }
    
    const schema = this.analyzeDocument(sample);
    
    return {
      collection: collection,
      schema: schema,
      sampleDocument: sample,
    };
  }

  private analyzeDocument(doc: any, depth: number = 0): any {
    if (depth > 3) return 'Object (max depth reached)';
    
    if (Array.isArray(doc)) {
      return doc.length > 0 ? [this.analyzeDocument(doc[0], depth + 1)] : [];
    }
    
    if (typeof doc === 'object' && doc !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(doc)) {
        result[key] = this.analyzeDocument(value, depth + 1);
      }
      return result;
    }
    
    return typeof doc;
  }

  private async getPerformanceMetrics(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const serverStatus = await this.db.admin().serverStatus();
      
      return {
        connections: serverStatus.connections,
        opcounters: serverStatus.opcounters,
        memory: serverStatus.mem,
        uptime: serverStatus.uptime,
        version: serverStatus.version,
      };
    } catch (error) {
      logger.warn('Could not get server status, returning basic metrics');
      return {
        message: 'Limited performance metrics available',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 서버 실행
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started successfully');
  }

  // 리소스 정리
  async cleanup(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.db = null;
    }
  }
}

// 싱글톤 인스턴스
export const mcpService = new MCPService();