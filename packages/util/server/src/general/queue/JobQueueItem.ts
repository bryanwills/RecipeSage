export interface JobQueueItem {
  jobId: string;
  storageKey?: string;
  credentials?: {
    username: string;
    password: string;
  };
}
