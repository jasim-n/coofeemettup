import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { CafesModule } from './cafes/cafes.module';
import { ChatModule } from './chat/chat.module';
import { TablesModule } from './tables/tables.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MatchingModule } from './matching/matching.module';
import { SafetyModule } from './safety/safety.module';
import { VerificationModule } from './verification/verification.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConnectionsModule } from './connections/connections.module';
import { DmModule } from './dm/dm.module';
import { InvitesModule } from './invites/invites.module';
import { ReactionsModule } from './reactions/reactions.module';
import { MailModule } from './mail/mail.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    MailModule,
    UsersModule,
    AuthModule,
    EventsModule,
    CafesModule,
    ChatModule,
    TablesModule,
    ReviewsModule,
    BookingsModule,
    PaymentsModule,
    AdminModule,
    FeedbackModule,
    MatchingModule,
    SafetyModule,
    VerificationModule,
    AuditModule,
    NotificationsModule,
    ConnectionsModule,
    DmModule,
    InvitesModule,
    ReactionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
