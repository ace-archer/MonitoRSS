import { Container } from 'inversify';
import 'reflect-metadata';
import configSchema, { Config } from './config-schema';
import connect from '@monitorss/models';
import { GuildService, SubscriptionService } from './services';
import { MongoClient } from 'mongodb';
import ProfileService from './services/ProfileService';

export interface MonitoServices {
  mongoDbClient: MongoClient;
  guildService: GuildService;
  subscriptionService: SubscriptionService;
  profileService: ProfileService;
}

async function setup(inputConfig: Config): Promise<MonitoServices> {
  const config = configSchema.parse(inputConfig);
  const modelExports = await connect(config.mongoUri);

  const container = new Container();
  container.bind<Config>('Config').toConstantValue(config);
  container.bind<typeof modelExports>('ModelExports').toConstantValue(modelExports);
  container.bind<GuildService>(GuildService).to(GuildService);
  container.bind<SubscriptionService>(SubscriptionService).to(SubscriptionService);
  container.bind<ProfileService>(ProfileService).to(ProfileService);

  return {
    mongoDbClient: modelExports.mongoDbClient,
    guildService: container.get<GuildService>(GuildService),
    subscriptionService: container.get<SubscriptionService>(SubscriptionService),
    profileService: container.get<ProfileService>(ProfileService),
  };
}

export default setup; 
export { default as ERROR_CODES } from './services/constants/error-codes';