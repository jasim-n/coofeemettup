import type {
  AdminParticipant,
  AdminReviewDto,
  AdminReviewsResponse,
  AdminTableParticipants,
  AdminUserDto,
  AdminUsersResponse,
  AttendanceStatus,
  AuditEntry,
  AuthResponse,
  BookingDto,
  BookingWithUser,
  Cafe,
  ChatResponse,
  ConnectionRequestDto,
  ConnectionState,
  CreateCafeInput,
  CreateEventInput,
  CreateTableInput,
  UpdateTableInput,
  DashboardMetrics,
  DmMessage,
  DmThread,
  GroupThread,
  EventDto,
  FeedbackDto,
  GenderTrack,
  GeocodeResult,
  GroupDto,
  MailProvider,
  MailProviderStatus,
  MatchGenerateResult,
  MatchResult,
  MyGroup,
  TestMailResult,
  NotificationsResponse,
  InterestMixDto,
  PendingVerification,
  CreateReviewInput,
  PublicProfileDto,
  PublicUser,
  ReactionKind,
  ReactionSummary,
  ReferralInfo,
  ReportDto,
  ReportStatus,
  ReviewTargetsResponse,
  Role,
  SuggestedPerson,
  TableChatResponse,
  AdminFeaturedTable,
  AdminTableDto,
  FeaturedFilters,
  FeaturedImageDto,
  TableDto,
  TableImageDto,
  MediaLayout,
  TableJoinRequestDto,
  UserReputation,
  UpdateCafeInput,
  UpdateEventInput,
  SubmitFeedbackInput,
  UpdateProfileInput,
  UserStatus,
  InviteDto,
} from '@jrst/types';

export * from '@jrst/types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Override fetch (e.g. for SSR / React Native). Defaults to global fetch. */
  fetch?: typeof fetch;
  /** 'web' (cookie + CSRF, default) or 'mobile' (bearer token, no CSRF). */
  clientType?: 'web' | 'mobile';
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/**
 * Isomorphic API client. Holds the CSRF token in memory (the cross-origin
 * cookie can't be read via JS) and attaches it as a header on every mutation.
 * Always sends credentials so the session + CSRF cookies ride along.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clientType: 'web' | 'mobile';
  private csrfToken: string | null = null;
  private authToken: string | null = null;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    // Native fetch must be called with `this === globalThis`; binding avoids
    // an "Illegal invocation" TypeError when stored as an instance field.
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.clientType = opts.clientType ?? 'web';
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  /** Bearer token for mobile clients (persist via SecureStore and restore with this). */
  getAuthToken(): string | null {
    return this.authToken;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.clientType === 'mobile') {
      headers['x-client'] = 'mobile';
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (!SAFE_METHODS.has(method) && this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const res = await this.fetchImpl(`${this.baseUrl}/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const record = (data ?? {}) as { message?: unknown; error?: unknown };
      const raw = record.message ?? record.error ?? res.statusText;
      const message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  // ---- health ----
  health(): Promise<{ status: string; db: string; ts: string }> {
    return this.request('GET', '/health');
  }

  // ---- auth ----
  requestOtp(
    email: string,
    intent: 'signup' | 'login' = 'login',
  ): Promise<{ ok: true; isNewUser: boolean; devCode?: string }> {
    return this.request('POST', '/auth/request-otp', { email, intent });
  }

  async verifyOtp(
    email: string,
    code: string,
    opts?: {
      phone?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      referralCode?: string;
      password?: string;
    },
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/verify-otp', {
      email,
      code,
      phone: opts?.phone,
      firstName: opts?.firstName,
      lastName: opts?.lastName,
      username: opts?.username,
      referralCode: opts?.referralCode,
      password: opts?.password,
    });
    this.csrfToken = res.csrfToken;
    if (this.clientType === 'mobile' && res.token) this.authToken = res.token;
    return res;
  }

  async login(email: string, password?: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/login', {
      email,
      password,
    });
    this.csrfToken = res.csrfToken;
    if (this.clientType === 'mobile' && res.token) this.authToken = res.token;
    return res;
  }

  requestPasswordReset(
    email: string,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.request('POST', '/auth/request-password-reset', { email });
  }

  async resetPassword(
    email: string,
    code: string,
    password: string,
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/reset-password', {
      email,
      code,
      password,
    });
    this.csrfToken = res.csrfToken;
    if (this.clientType === 'mobile' && res.token) this.authToken = res.token;
    return res;
  }

  /** Live handle-availability check for the signup + profile forms. */
  usernameAvailable(u: string): Promise<{ available: boolean; valid: boolean }> {
    return this.request('GET', `/users/username-available?u=${encodeURIComponent(u)}`);
  }

  /** Bootstraps an existing session; throws ApiError(401) if not logged in. */
  async me(): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('GET', '/auth/me');
    this.csrfToken = res.csrfToken;
    return res;
  }

  async logout(): Promise<{ ok: true }> {
    const res = await this.request<{ ok: true }>('POST', '/auth/logout');
    this.csrfToken = null;
    this.authToken = null;
    return res;
  }

  // ---- profile ----
  updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    return this.request('PATCH', '/users/me', input);
  }

  myReferral(): Promise<ReferralInfo> {
    return this.request('GET', '/users/me/referral');
  }

  myInterestMix(): Promise<InterestMixDto> {
    return this.request('GET', '/users/me/interest-mix');
  }

  // ---- events ----
  browseEvents(params?: { area?: string; genderTrack?: GenderTrack }): Promise<EventDto[]> {
    const q = new URLSearchParams();
    if (params?.area) q.set('area', params.area);
    if (params?.genderTrack) q.set('genderTrack', params.genderTrack);
    const qs = q.toString();
    return this.request('GET', `/events${qs ? `?${qs}` : ''}`);
  }

  getEvent(id: string): Promise<EventDto> {
    return this.request('GET', `/events/${id}`);
  }

  listAllEvents(): Promise<EventDto[]> {
    return this.request('GET', '/events/admin/all');
  }

  createEvent(input: CreateEventInput): Promise<EventDto> {
    return this.request('POST', '/events', input);
  }

  updateEvent(eventId: string, input: UpdateEventInput): Promise<EventDto> {
    return this.request('PATCH', `/events/${eventId}`, input);
  }

  cancelEvent(eventId: string): Promise<EventDto> {
    return this.request('POST', `/events/${eventId}/cancel`);
  }

  // ---- cafes (admin) ----
  listCafes(): Promise<Cafe[]> {
    return this.request('GET', '/cafes');
  }

  createCafe(input: CreateCafeInput): Promise<Cafe> {
    return this.request('POST', '/cafes', input);
  }

  updateCafe(id: string, input: UpdateCafeInput): Promise<Cafe> {
    return this.request('PATCH', `/cafes/${id}`, input);
  }

  deleteCafe(id: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/cafes/${id}`);
  }

  // ---- bookings ----
  joinEvent(eventId: string): Promise<BookingDto> {
    return this.request('POST', `/events/${eventId}/join`);
  }

  /** Starts hosted checkout; returns the URL to redirect the browser to. */
  initiatePayment(
    bookingId: string,
    returnUrl: string,
  ): Promise<{ checkoutUrl: string; paymentRef: string }> {
    return this.request('POST', `/bookings/${bookingId}/pay`, { returnUrl });
  }

  myBookings(): Promise<BookingDto[]> {
    return this.request('GET', '/bookings/me');
  }

  cancelBooking(bookingId: string): Promise<BookingDto> {
    return this.request('POST', `/bookings/${bookingId}/cancel`);
  }

  // ---- admin ----
  eventBookings(eventId: string): Promise<BookingWithUser[]> {
    return this.request('GET', `/events/${eventId}/bookings`);
  }

  createGroup(eventId: string, userIds: string[]): Promise<GroupDto> {
    return this.request('POST', `/events/${eventId}/groups`, { userIds });
  }

  listGroups(eventId: string): Promise<GroupDto[]> {
    return this.request('GET', `/events/${eventId}/groups`);
  }

  markAttendance(bookingId: string, status: AttendanceStatus): Promise<BookingDto> {
    return this.request('POST', `/bookings/${bookingId}/attendance`, { status });
  }

  // ---- matching (admin) ----
  suggestMatch(eventId: string): Promise<MatchResult> {
    return this.request('GET', `/events/${eventId}/match/suggest`);
  }

  generateMatch(eventId: string): Promise<MatchGenerateResult> {
    return this.request('POST', `/events/${eventId}/match/generate`);
  }

  // ---- feedback ----
  submitFeedback(eventId: string, input: SubmitFeedbackInput): Promise<FeedbackDto> {
    return this.request('POST', `/events/${eventId}/feedback`, input);
  }

  myFeedback(eventId: string): Promise<FeedbackDto | null> {
    return this.request('GET', `/events/${eventId}/feedback/mine`);
  }

  // ---- safety ----
  reportUser(userId: string, reason: string, eventId?: string): Promise<ReportDto> {
    return this.request('POST', `/users/${userId}/report`, { reason, eventId });
  }

  blockUser(userId: string): Promise<{ ok: true }> {
    return this.request('POST', `/users/${userId}/block`);
  }

  unblockUser(userId: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/users/${userId}/block`);
  }

  myBlocks(): Promise<{ blockedUserIds: string[] }> {
    return this.request('GET', '/users/me/blocks');
  }

  adminReports(): Promise<ReportDto[]> {
    return this.request('GET', '/admin/reports');
  }

  myGroup(eventId: string): Promise<MyGroup> {
    return this.request('GET', `/events/${eventId}/my-group`);
  }

  // ---- group chat ----
  eventChat(eventId: string): Promise<ChatResponse> {
    return this.request('GET', `/events/${eventId}/chat`);
  }

  sendChatMessage(eventId: string, body: string): Promise<{ ok: true }> {
    return this.request('POST', `/events/${eventId}/chat`, { body });
  }

  // ---- profile photo ----
  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    return this.uploadFile('/api/users/me/photo', file) as Promise<{
      photoUrl: string;
    }>;
  }

  /** Upload a table banner/cover → returns { url }. Used at create/edit time. */
  async uploadTableCover(file: File): Promise<{ url: string }> {
    return this.uploadFile('/api/tables/cover', file) as Promise<{ url: string }>;
  }

  // Shared multipart upload — attaches auth/CSRF and lets the browser set the
  // multipart boundary (no Content-Type header).
  private async uploadFile(path: string, file: File): Promise<unknown> {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    if (this.clientType === 'mobile') {
      headers['x-client'] = 'mobile';
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const record = (data ?? {}) as { message?: unknown };
      throw new ApiError(res.status, String(record.message ?? res.statusText), data);
    }
    return data;
  }

  // ---- verification (CNIC) ----
  async uploadCnic(file: Blob): Promise<{ status: string }> {
    const form = new FormData();
    form.append('image', file);
    const headers: Record<string, string> = {};
    if (this.clientType === 'mobile') {
      headers['x-client'] = 'mobile';
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    // No Content-Type: the browser sets the multipart boundary.
    const res = await this.fetchImpl(`${this.baseUrl}/api/users/me/cnic`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const record = (data ?? {}) as { message?: unknown };
      throw new ApiError(res.status, String(record.message ?? res.statusText), data);
    }
    return data as { status: string };
  }

  adminVerifications(): Promise<PendingVerification[]> {
    return this.request('GET', '/admin/verifications');
  }

  verifyUser(userId: string, approve: boolean): Promise<{ id: string; verificationStatus: string }> {
    return this.request('POST', `/users/${userId}/verify`, { approve });
  }

  /** Full URL for a pending user's CNIC image (admin <img src>; same-site cookie auth). */
  cnicImageUrl(userId: string): string {
    return `${this.baseUrl}/api/admin/verifications/${userId}/image`;
  }

  adminAudit(): Promise<AuditEntry[]> {
    return this.request('GET', '/admin/audit');
  }

  adminMetrics(): Promise<DashboardMetrics> {
    return this.request('GET', '/admin/metrics');
  }

  adminSetHost(userId: string, canHost: boolean): Promise<{ id: string; phone: string; canHost: boolean }> {
    return this.request('POST', `/users/${userId}/host`, { canHost });
  }

  adminSetHostByPhone(phone: string, canHost: boolean): Promise<{ id: string; phone: string; canHost: boolean }> {
    return this.request('POST', '/admin/host', { phone, canHost });
  }

  // ---- admin user management ----
  adminListUsers(q = '', limit = 30, offset = 0): Promise<AdminUsersResponse> {
    const qs = new URLSearchParams({ q, limit: String(limit), offset: String(offset) }).toString();
    return this.request('GET', `/admin/users?${qs}`);
  }

  adminSetUserStatus(id: string, status: UserStatus): Promise<AdminUserDto> {
    return this.request('POST', `/admin/users/${id}/status`, { status });
  }

  adminSetUserRole(id: string, role: Role): Promise<AdminUserDto> {
    return this.request('POST', `/admin/users/${id}/role`, { role });
  }

  adminRevokeVerification(id: string): Promise<AdminUserDto> {
    return this.request('POST', `/admin/users/${id}/revoke-verification`);
  }

  adminResolveReport(id: string, status: ReportStatus, banSubject = false): Promise<unknown> {
    return this.request('PATCH', `/admin/reports/${id}`, { status, banSubject });
  }

  // ---- mail provider (OTP sender) ----
  adminGetMailProvider(): Promise<MailProviderStatus> {
    return this.request('GET', '/admin/mail/provider');
  }

  adminSetMailProvider(provider: MailProvider): Promise<MailProviderStatus> {
    return this.request('POST', '/admin/mail/provider', { provider });
  }

  adminSendTestMail(email: string): Promise<TestMailResult> {
    return this.request('POST', '/admin/mail/test', { email });
  }

  // ---- tables (host-created, approval-based join) ----
  createTable(input: CreateTableInput): Promise<TableDto> {
    return this.request('POST', '/tables', input);
  }

  updateTable(id: string, input: UpdateTableInput): Promise<TableDto> {
    return this.request('PATCH', `/tables/${id}`, input);
  }

  browseTables(): Promise<TableDto[]> {
    return this.request('GET', '/tables');
  }

  // Free place search (Photon/OSM) for the venue picker.
  geocode(q: string): Promise<GeocodeResult[]> {
    return this.request('GET', `/geocode?q=${encodeURIComponent(q)}`);
  }

  getTable(id: string): Promise<TableDto> {
    return this.request('GET', `/tables/${id}`);
  }

  myHostedTables(): Promise<TableDto[]> {
    return this.request('GET', '/tables/mine/hosting');
  }

  myJoinedTables(): Promise<TableDto[]> {
    return this.request('GET', '/tables/mine/joined');
  }

  requestJoinTable(id: string): Promise<TableJoinRequestDto> {
    return this.request('POST', `/tables/${id}/join`);
  }

  leaveTable(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/tables/${id}/leave`);
  }

  myTableRequests(): Promise<TableJoinRequestDto[]> {
    return this.request('GET', '/tables/mine/requests');
  }

  tableRequests(id: string): Promise<TableJoinRequestDto[]> {
    return this.request('GET', `/tables/${id}/requests`);
  }

  approveTableRequest(id: string, reqId: string): Promise<{ ok: true }> {
    return this.request('POST', `/tables/${id}/requests/${reqId}/approve`);
  }

  declineTableRequest(id: string, reqId: string): Promise<{ ok: true }> {
    return this.request('POST', `/tables/${id}/requests/${reqId}/decline`);
  }

  // ---- host: end event + event photos ----
  completeTable(id: string): Promise<TableDto> {
    return this.request('POST', `/tables/${id}/complete`);
  }

  tableImages(id: string): Promise<TableImageDto[]> {
    return this.request('GET', `/tables/${id}/images`);
  }

  deleteTableImage(id: string, imageId: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/tables/${id}/images/${imageId}`);
  }

  async uploadTableImage(id: string, file: File): Promise<TableImageDto> {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    if (this.clientType === 'mobile') {
      headers['x-client'] = 'mobile';
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    // No Content-Type: the browser sets the multipart boundary.
    const res = await this.fetchImpl(`${this.baseUrl}/api/tables/${id}/images`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const record = (data ?? {}) as { message?: unknown };
      throw new ApiError(res.status, String(record.message ?? res.statusText), data);
    }
    return data as TableImageDto;
  }

  async uploadTableVideo(
    id: string,
    file: File,
    caption?: string,
  ): Promise<TableImageDto> {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    const headers: Record<string, string> = {};
    if (this.clientType === 'mobile') {
      headers['x-client'] = 'mobile';
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await this.fetchImpl(`${this.baseUrl}/api/tables/${id}/videos`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const record = (data ?? {}) as { message?: unknown };
      throw new ApiError(res.status, String(record.message ?? res.statusText), data);
    }
    return data as TableImageDto;
  }

  createTableCollage(
    id: string,
    imageIds: string[],
    caption?: string,
  ): Promise<TableImageDto> {
    return this.request('POST', `/tables/${id}/collages`, { imageIds, caption });
  }

  tableChat(id: string): Promise<TableChatResponse> {
    return this.request('GET', `/tables/${id}/chat`);
  }

  sendTableMessage(id: string, body: string): Promise<{ ok: true }> {
    return this.request('POST', `/tables/${id}/chat`, { body });
  }

  closeTableChat(id: string): Promise<{ ok: true; chatClosedAt: string }> {
    return this.request('POST', `/tables/${id}/chat/close`);
  }

  tableParticipants(id: string): Promise<
    Array<{
      userId: string;
      status: string;
      createdAt: string;
      user: PublicUser | null;
    }>
  > {
    return this.request('GET', `/tables/${id}/participants`);
  }

  removeTableParticipant(
    tableId: string,
    userId: string,
  ): Promise<{ ok: true }> {
    return this.request('DELETE', `/tables/${tableId}/participants/${userId}`);
  }

  saveTable(id: string): Promise<{ saved: boolean }> {
    return this.request('POST', `/tables/${id}/save`);
  }

  mySavedTables(): Promise<TableDto[]> {
    return this.request('GET', '/tables/mine/saved');
  }

  adminListTables(): Promise<AdminTableDto[]> {
    return this.request('GET', '/admin/tables');
  }

  adminCancelTable(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/admin/tables/${id}/cancel`);
  }

  adminTableParticipants(tableId: string): Promise<AdminTableParticipants> {
    return this.request('GET', `/admin/tables/${tableId}/participants`);
  }

  adminRemoveParticipant(tableId: string, userId: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/admin/tables/${tableId}/participants/${userId}`);
  }

  adminCloseTableChat(
    tableId: string,
  ): Promise<{ ok: true; chatClosedAt: string }> {
    return this.request('POST', `/admin/tables/${tableId}/chat/close`);
  }

  adminDeleteTable(tableId: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/admin/tables/${tableId}`);
  }

  adminInvalidateCache(
    scope: 'all' | 'tables' | 'tables:browse' | 'tables:mine' = 'all',
    userId?: string,
  ): Promise<{ ok: true; scope: string; removed: number }> {
    return this.request('POST', '/admin/cache/invalidate', { scope, userId });
  }

  adminFlushCache(): Promise<{ ok: true; scope: string; removed: number }> {
    return this.request('DELETE', '/admin/cache');
  }

  adminListReviews(limit = 30, offset = 0): Promise<AdminReviewsResponse> {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString();
    return this.request('GET', `/admin/reviews?${qs}`);
  }

  adminDeleteReview(id: string): Promise<{ ok: true }> {
    return this.request('DELETE', `/admin/reviews/${id}`);
  }

  // ---- public profile ----
  publicProfile(id: string): Promise<PublicProfileDto> {
    return this.request('GET', `/users/${id}/profile`);
  }

  // ---- reviews ----
  tableReviewTargets(id: string): Promise<ReviewTargetsResponse> {
    return this.request('GET', `/tables/${id}/review-targets`);
  }

  createReview(tableId: string, input: CreateReviewInput): Promise<unknown> {
    return this.request('POST', `/tables/${tableId}/reviews`, input);
  }

  myReviews(): Promise<UserReputation> {
    return this.request('GET', '/users/me/reviews');
  }

  userReviews(userId: string): Promise<UserReputation> {
    return this.request('GET', `/users/${userId}/reviews`);
  }

  // ---- connections (social graph) ----
  /** Search active members by @username only (invite picker). Needs 2+ chars. */
  searchUsers(q: string, limit = 20): Promise<PublicUser[]> {
    const qs = new URLSearchParams({ q, limit: String(limit) }).toString();
    return this.request('GET', `/users/search?${qs}`);
  }

  myConnections(): Promise<PublicUser[]> {
    return this.request('GET', '/connections/mine');
  }

  connectionRequests(): Promise<ConnectionRequestDto[]> {
    return this.request('GET', '/connections/requests');
  }

  connectionSuggestions(): Promise<SuggestedPerson[]> {
    return this.request('GET', '/connections/suggestions');
  }

  requestConnection(userId: string): Promise<{ status: ConnectionState }> {
    return this.request('POST', `/connections/${userId}/request`);
  }

  acceptConnection(userId: string): Promise<{ status: ConnectionState }> {
    return this.request('POST', `/connections/${userId}/accept`);
  }

  declineConnection(userId: string): Promise<{ status: ConnectionState }> {
    return this.request('POST', `/connections/${userId}/decline`);
  }

  removeConnection(userId: string): Promise<{ status: ConnectionState }> {
    return this.request('DELETE', `/connections/${userId}`);
  }

  // ---- direct messages ----
  dmThreads(): Promise<DmThread[]> {
    return this.request('GET', '/dm/threads');
  }

  groupThreads(): Promise<GroupThread[]> {
    return this.request('GET', '/tables/mine/group-threads');
  }

  // ---- featured event photos (home section) ----
  featuredImages(): Promise<FeaturedImageDto[]> {
    return this.request('GET', '/tables/featured');
  }

  adminFeaturedTables(filters: FeaturedFilters = {}): Promise<AdminFeaturedTable[]> {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.status) p.set('status', filters.status);
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    if (filters.hasPhotos) p.set('hasPhotos', 'true');
    if (filters.bookmarked) p.set('bookmarked', 'true');
    const qs = p.toString();
    return this.request('GET', `/admin/featured/tables${qs ? `?${qs}` : ''}`);
  }

  adminTableImages(tableId: string): Promise<TableImageDto[]> {
    return this.request('GET', `/admin/tables/${tableId}/images`);
  }

  adminSetImageFeatured(imageId: string, featured: boolean): Promise<{ ok: true }> {
    return this.request('POST', `/admin/images/${imageId}/feature`, { featured });
  }

  adminSetImageLayout(imageId: string, layout: MediaLayout): Promise<TableImageDto> {
    return this.request('PATCH', `/admin/images/${imageId}/layout`, layout);
  }

  markGroupRead(tableId: string): Promise<{ ok: true }> {
    return this.request('POST', `/tables/${tableId}/read`);
  }

  dmThread(userId: string): Promise<DmMessage[]> {
    return this.request('GET', `/dm/${userId}`);
  }

  sendDm(userId: string, body: string): Promise<DmMessage> {
    return this.request('POST', `/dm/${userId}`, { body });
  }

  // ---- reactions ----
  toggleReaction(kind: ReactionKind, messageId: string, emoji: string): Promise<ReactionSummary[]> {
    return this.request('POST', `/reactions/${kind}/${messageId}`, { emoji });
  }

  // ---- table invitations ----
  inviteToTable(tableId: string, userId: string): Promise<InviteDto> {
    return this.request('POST', '/invites', { tableId, userId });
  }

  myInvites(): Promise<InviteDto[]> {
    return this.request('GET', '/invites/mine');
  }

  /** Invitees the host has already invited to a table (host only). */
  tableInvites(tableId: string): Promise<{ inviteeId: string; status: string }[]> {
    return this.request('GET', `/invites/table/${tableId}`);
  }

  acceptInvite(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/invites/${id}/accept`);
  }

  declineInvite(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/invites/${id}/decline`);
  }

  maybeInvite(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/invites/${id}/maybe`);
  }

  // ---- notifications ----
  notifications(): Promise<NotificationsResponse> {
    return this.request('GET', '/notifications/me');
  }

  markNotificationRead(id: string): Promise<{ ok: true }> {
    return this.request('POST', `/notifications/${id}/read`);
  }

  markAllNotificationsRead(): Promise<{ ok: true }> {
    return this.request('POST', '/notifications/read-all');
  }
}
