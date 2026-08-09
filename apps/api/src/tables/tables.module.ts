import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { ReactionsModule } from '../reactions/reactions.module';

@Module({
  imports: [ReactionsModule],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
