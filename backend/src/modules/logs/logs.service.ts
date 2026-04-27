import { AppDataSource } from '../../database/config';
import { Log } from '../../entities/platform/Log';

const logRepo = () => AppDataSource.getRepository(Log);

export const getAllLogs = async (limit = 100) => {
  return logRepo()
    .createQueryBuilder('log')
    .orderBy('log.createdAt', 'DESC')
    .take(limit)
    .getMany();
};

export const createLog = async (action: string, performedBy: string, details?: string, ipAddress?: string) => {
  const log = logRepo().create({ action, performedBy, details: details || null, ipAddress: ipAddress || null });
  return logRepo().save(log);
};
