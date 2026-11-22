export interface Announcement {
  announcementid: string;
  adminid: string;
  title: string;
  message: string;
  created_at: string;
}

export type TicketStatus = "Open" | "InProgress" | "Resolved";

export interface SupportTicket {
  ticketid: string;
  studentid: string;
  adminid: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
}
