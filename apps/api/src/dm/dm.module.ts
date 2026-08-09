import { Module } from '@nestjs/common';
import { DmController } from './dm.controller';
import { DmService } from './dm.service';
import { ReactionsModule } from '../reactions/reactions.module';

@Module({
  imports: [ReactionsModule],
  controllers: [DmController],
  providers: [DmService],
})
export class DmModule {}
