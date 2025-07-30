/**
 * GraphQL 리졸버 통합 모듈
 * Query와 Mutation 리졸버를 통합하여 Apollo Server에 제공합니다.
 */

import { queryResolvers } from './queryResolvers';
import { mutationResolvers } from './mutationResolvers';
import { subscriptionResolvers } from './subscriptionResolvers';
import authResolvers from './authResolvers';
import type { Resolvers } from '../types';

/**
 * 통합 리졸버 객체
 * Query, Mutation, Subscription 리졸버를 통합합니다.
 * TypeScript 철의 장막 규칙을 준수하며 타입 안전성을 보장합니다.
 */
export const resolvers: Resolvers = {
  Query: {
    ...queryResolvers,
    ...authResolvers.Query
  },
  Mutation: {
    ...mutationResolvers,
    ...authResolvers.Mutation
  },
  Subscription: subscriptionResolvers
};

export default resolvers;