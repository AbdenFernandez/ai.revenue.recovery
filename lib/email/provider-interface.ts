import type {
  EmailMessage,
  SendBatchResult,
  SendEmailResult,
} from "@/types/email";

export interface EmailProvider {
  readonly name: string;
  sendEmail(message: EmailMessage): Promise<SendEmailResult>;
  sendBatch(messages: EmailMessage[]): Promise<SendBatchResult>;
}
