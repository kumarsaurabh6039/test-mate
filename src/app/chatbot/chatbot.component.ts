import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked,
  inject, ChangeDetectorRef, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ChatbotService, EnrollmentItem, HolidayItem } from '../services/chatbot.service';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  richCard?: RichCard;
  followUps?: string[];     // Auto follow-up suggestions
}

export interface RichCard {
  type: 'table' | 'list' | 'attendance' | 'profile' | 'links' | 'training' | 'team';
  title: string;
  icon: string;
  rows?: { label: string; value: string; badge?: string; badgeClass?: string }[];
  items?: {
    icon: string; title: string; subtitle: string;
    action?: string; actionUrl?: string;
  }[];
}

interface BotResponse {
  text: string;
  richCard?: RichCard;
  intentKey?: string;
  followUps?: string[];     // Added this property to resolve the TS error
}

// Intent handler now receives the input string
interface AsyncIntent {
  patterns: RegExp[];
  key: string;
  handler: (input: string) => Promise<BotResponse>;
}

// Follow-up map for various intents
const FOLLOW_UP_MAP: Record<string, string[]> = {
  assets:         ['Raise an IT ticket', 'Check IT policies', 'View my profile'],
  attendance:     ['Check leave balance', 'Apply for leave', 'View holidays'],
  leave_balance:  ['Apply for leave', 'View leave requests', 'Check holidays'],
  leave_requests: ['Check leave balance', 'Apply for leave', 'View my attendance'],
  leave_general:  ['Check leave balance', 'View leave requests', 'Check holidays'],
  team:           ['View my profile', 'Check attendance', 'View notifications'],
  profile:        ['View my salary', 'Check attendance', 'Who is on my team?'],
  salary:         ['Download payslip', 'View my profile', 'Check leave balance'],
  training:       ['View HR policies', 'Check my notifications', 'View my profile'],
  holidays:       ['Check leave balance', 'Apply for leave', 'View my attendance'],
  notifications:  ['Check leave requests', 'View my assets', 'View useful resources'],
  resources:      ['Raise an IT ticket', 'View HR policies', 'Check my notifications'],
  it_ticket:      ['View my assets', 'View useful resources', 'Check HR policies'],
  payslip:        ['View my salary details', 'Check leave balance', 'View my profile'],
  onboarding:     ['View HR policies', 'Raise an IT ticket', 'Who is on my team?'],
  greeting:       ['Show my leave balance', 'View my attendance', 'Know about policy'],
  help:           ['Show my leave balance', 'View my attendance', 'Know about policy'],
  thanks:         ['Show my leave balance', 'View my attendance', 'Know about policy'],
  policy:         ['Check my leave balance', 'Raise an IT ticket', 'Who is on my team?'],
  fallback:       ['Show my leave balance', 'View my attendance', 'Know about policy'],
};

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {

  private cdr = inject(ChangeDetectorRef);
  private svc = inject(ChatbotService);

  @Input() empId: string = '';

  messages:    ChatMessage[] = [];
  userInput:   string  = '';
  isLoading:   boolean = false;
  isChatOpen:  boolean = false;
  showWelcome: boolean = true;
  inputRows:   number  = 1;

  // AI Session ID to retain context across policy queries
  currentAiSessionId: number | undefined = undefined;
  private shouldScrollToBottom = false;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('inputField')        private inputField!:        ElementRef;

  quickPrompts: string[] = [
    'Know about policy',
    'What assets are assigned to me?',
    'Show my attendance this month',
    'What is my leave balance?',
    'Who is on my team?',
    'Show my salary details',
  ];

  private get resolvedEmpId(): string {
    return this.empId || this.svc.getCurrentEmpId();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASYNC INTENT ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  private asyncIntents: AsyncIntent[] = [

    // ── EXPLICIT POLICY TRIGGER ───────────────────────────────────────────
    {
      key: 'policy_trigger',
      patterns: [/^know about policy$/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'policy',
        text: 'What would you like to know about the company policies? You can ask questions like "What is the WFH policy?" or "How many maternity leaves do I get?". I will search through the uploaded HR documents to find your answer.',
        followUps: ['What is the WFH policy?', 'Check my leave balance', 'Show my attendance']
      })
    },

    // ── ASSETS ────────────────────────────────────────────────────────────
    {
      key: 'assets',
      patterns: [/asset|laptop|device|equipment|phone|monitor|hardware|assigned to me/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const res = await firstValueFrom(this.svc.getMyAssets(empId));
        if (!res || !res.assets?.length) {
          return { text: 'No assets are currently assigned to you. Contact IT if you believe this is incorrect.', intentKey: 'assets' };
        }

        return {
          intentKey: 'assets',
          text: `You have **${res.totalCount} asset(s)** assigned to you. Serial numbers are tracked by IT — contact them for any maintenance requests.`,
          richCard: {
            type: 'table',
            title: 'My Assigned Assets',
            icon: 'fas fa-box-open',
            rows: res.assets.slice(0, 8).map(a => ({
              label: `${a.name} (${a.type})`,
              value: `SN: ${a.serialNumber}`,
              badge: a.status,
              badgeClass: this.svc.assetBadgeClass(a.status)
            }))
          }
        };
      }
    },

    // ── ATTENDANCE ────────────────────────────────────────────────────────
    {
      key: 'attendance',
      patterns: [/attendance|swipe|check.?in|punch|work hours|present|absent|half day|on duty/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const [summary, list] = await Promise.all([
          firstValueFrom(this.svc.getAttendanceSummary(empId)),
          firstValueFrom(this.svc.getAttendanceByEmployee(empId))
        ]);

        if (summary?.length) {
          const recent = summary.slice(-7).reverse();
          return {
            intentKey: 'attendance',
            text: `Here is your **attendance summary** for the last ${recent.length} days. Check the HR Portal for regularisation requests.`,
            richCard: {
              type: 'attendance',
              title: 'Attendance Summary',
              icon: 'fas fa-exchange-alt',
              rows: recent.map(s => ({
                label: this.svc.formatDate(s.date),
                value: `${this.svc.formatTime(s.firstLogin)} → ${this.svc.formatTime(s.lastLogout)}  |  ${s.duration}`,
                badge: 'Present',
                badgeClass: 'badge-green'
              }))
            }
          };
        }

        if (list?.attendances?.length) {
          const recent = list.attendances.slice(0, 7);
          return {
            intentKey: 'attendance',
            text: `Here is your **attendance for the last ${recent.length} records**. Missed punch-outs can be regularised via the HR Portal.`,
            richCard: {
              type: 'attendance',
              title: 'Attendance Records',
              icon: 'fas fa-exchange-alt',
              rows: recent.map(a => ({
                label: this.svc.formatDate(a.date),
                value: `${this.svc.formatTime(a.loginTime)} → ${this.svc.formatTime(a.logoutTime)}`,
                badge: a.status.replace('_', ' '),
                badgeClass: this.svc.attendanceBadgeClass(a.status)
              }))
            }
          };
        }

        return { intentKey: 'attendance', text: 'No attendance records found. If you have recently joined, records may appear after your first check-in.' };
      }
    },

    // ── LEAVE BALANCE ─────────────────────────────────────────────────────
    {
      key: 'leave_balance',
      patterns: [/leave balance|casual leave|sick leave|privilege leave|pl |cl |el |sl |annual leave|leave.*available|available.*leave/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const balances = await firstValueFrom(this.svc.getLeaveBalance(empId));
        if (!balances?.length) {
          return { intentKey: 'leave_balance', text: 'No leave balance found. Please contact HR to ensure your leave account is set up.' };
        }

        const totalConsumed = balances.reduce((acc, b) => acc + (b.consumed || 0), 0);
        return {
          intentKey: 'leave_balance',
          text: `Here is your **leave balance**. You have used **${totalConsumed} day(s)** across all leave types. To apply for leave, go to **HR Portal → My Leaves → Apply**.`,
          richCard: {
            type: 'table',
            title: 'Leave Balance',
            icon: 'fas fa-calendar-check',
            rows: balances.map(b => ({
              label: b.leaveType,
              value: `${b.available} days available  (${b.consumed} used)`,
              badge: `${b.annualQuota} total`,
              badgeClass: 'badge-blue'
            }))
          }
        };
      }
    },

    // ── LEAVE REQUESTS (recent) ────────────────────────────────────────────
    {
      key: 'leave_requests',
      patterns: [/leave request|my leave|applied.*leave|leave.*status|pending leave|leave.*history/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const res = await firstValueFrom(this.svc.getLeaveRequests(empId));
        if (!res?.leaveRequests?.length) {
          return { intentKey: 'leave_requests', text: 'You have no leave requests on record. Apply for leave via **HR Portal → My Leaves → Apply**.' };
        }

        const recent = res.leaveRequests.slice(0, 6);
        return {
          intentKey: 'leave_requests',
          text: `You have **${res.totalCount} leave request(s)** in total. Here are your most recent ones.`,
          richCard: {
            type: 'table',
            title: 'Recent Leave Requests',
            icon: 'fas fa-calendar-alt',
            rows: recent.map(r => ({
              label: `${r.leaveType}  (${this.svc.formatDate(r.fromDate)} – ${this.svc.formatDate(r.toDate)})`,
              value: `${r.days} day(s)`,
              badge: r.status,
              badgeClass: this.svc.leaveBadgeClass(r.status)
            }))
          }
        };
      }
    },

    // ── LEAVE (general / apply) ────────────────────────────────────────────
    {
      key: 'leave_general',
      patterns: [/\bleave\b|vacation|time off|how.*apply|apply.*leave/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        const balances = empId ? await firstValueFrom(this.svc.getLeaveBalance(empId)) : null;

        if (balances?.length) {
          const totalConsumed = balances.reduce((acc, b) => acc + (b.consumed || 0), 0);
          return {
            intentKey: 'leave_general',
            text: `Here is your **leave balance**. You have used **${totalConsumed} day(s)** this year. To apply for leave, go to **HR Portal → My Leaves → Apply**.`,
            richCard: {
              type: 'table',
              title: 'Leave Balance',
              icon: 'fas fa-calendar-check',
              rows: balances.map(b => ({
                label: b.leaveType,
                value: `${b.available} days available  (${b.consumed} used)`,
                badge: `${b.annualQuota} total`,
                badgeClass: 'badge-blue'
              }))
            }
          };
        }

        return {
          intentKey: 'leave_general',
          text: 'To apply for leave, follow these steps from the HR Portal. For urgent cases, contact your manager directly.',
          richCard: {
            type: 'list',
            title: 'How to Apply for Leave',
            icon: 'fas fa-calendar-plus',
            items: [
              { icon: 'fas fa-sign-in-alt', title: 'Open HR Portal',       subtitle: 'Navigate to My Leaves → Apply for Leave' },
              { icon: 'fas fa-list-ul',     title: 'Select Leave Type',     subtitle: 'Choose Casual, Sick, Privilege, or other leave type' },
              { icon: 'fas fa-paper-plane', title: 'Submit for Approval',   subtitle: 'Your manager will receive a notification and approve or reject' },
            ]
          }
        };
      }
    },

    // ── TEAM ──────────────────────────────────────────────────────────────
    {
      key: 'team',
      patterns: [/team|colleague|member|who.*my team|manager|lead|reporting|org.*chart/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const res = await firstValueFrom(this.svc.getMyTeams(empId));
        if (!res?.teams?.length) {
          return { intentKey: 'team', text: 'You are not currently assigned to any team. Contact HR to update your team assignment.' };
        }

        const team    = res.teams[0];
        const members = team.memberContacts || [];
        const mgr     = team.managerContact;

        const items: RichCard['items'] = [];
        if (mgr) {
          items.push({
            icon: 'fas fa-crown',
            title: `${mgr.fullName}  (Manager)`,
            subtitle: `${mgr.designation || 'Manager'}  ·  ${mgr.email || ''}`
          });
        }
        members.forEach(m => {
          if (m.empId === empId) return;
          items.push({
            icon: 'fas fa-user',
            title: m.fullName,
            subtitle: `${m.designation || m.role || ''}  ·  ${m.email || ''}`
          });
        });

        return {
          intentKey: 'team',
          text: `You are part of **${team.teamName}** with **${items.length} member(s)**. Use the contact details below to reach them.`,
          richCard: {
            type: 'team',
            title: team.teamName,
            icon: 'fas fa-users',
            items: items.slice(0, 8)
          }
        };
      }
    },

    // ── PROFILE ───────────────────────────────────────────────────────────
    {
      key: 'profile',
      patterns: [/profile|my info|personal detail|edit.*profile|my detail|employee id|who am i/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const p = await firstValueFrom(this.svc.getMyProfile(empId));
        if (!p) {
          return { intentKey: 'profile', text: 'Could not fetch your profile right now. Please try again or check the HR Portal.' };
        }

        return {
          intentKey: 'profile',
          text: 'Here is a snapshot of your **employee profile**. To edit contact details or address, click **Edit Profile** in Settings.',
          richCard: {
            type: 'profile',
            title: 'My Profile',
            icon: 'fas fa-user-circle',
            rows: [
              { label: 'Full Name',    value: `${p.firstName} ${p.middleName || ''} ${p.surname}`.trim() },
              { label: 'Employee ID',  value: p.empId },
              { label: 'Department',   value: p.department   || '—' },
              { label: 'Designation',  value: p.designation  || '—' },
              { label: 'Role',         value: p.role         || '—' },
              { label: 'Joining Date', value: this.svc.formatDate(p.joiningDate) },
              { label: 'Location',     value: p.location     || '—' },
              { label: 'Reporting To', value: p.managerEmpId || '—' },
              { label: 'Mobile',       value: p.mobileNumber || '—' },
            ]
          }
        };
      }
    },

    // ── SALARY / PAYROLL ──────────────────────────────────────────────────
    {
      key: 'salary',
      patterns: [/salary|payroll|pay.*slip|payslip|ctc|compensation|increment|appraisal|hike|in.?hand|gross/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const [ctcRes, payslips] = await Promise.all([
          firstValueFrom(this.svc.getCtcDetail(empId)),
          firstValueFrom(this.svc.getPayslipsByEmployee(empId))
        ]);

        const ctc  = ctcRes?.ctcDetail;
        const last = payslips?.[0];

        const rows: { label: string; value: string; badge?: string; badgeClass?: string }[] = [];

        if (ctc) {
          rows.push(
            { label: 'Gross Salary',       value: this.svc.formatCurrency(ctc.grossSalary),     badge: ctc.isMonthly ? 'Monthly' : 'Annual', badgeClass: 'badge-blue' },
            { label: 'Net Pay',            value: this.svc.formatCurrency(ctc.netPay),           badge: 'In-hand',   badgeClass: 'badge-green' },
            { label: 'Basic',              value: this.svc.formatCurrency(ctc.basicPay) },
            { label: 'HRA',                value: this.svc.formatCurrency(ctc.hra) },
          );
        }

        if (last) {
          rows.push(
            { label: `Last Payslip (${this.svc.formatDate(last.payDate)})`,
              value: this.svc.formatCurrency(last.netPay),
              badge: 'Processed', badgeClass: 'badge-green' }
          );
        }

        if (!rows.length) {
          return { intentKey: 'salary', text: 'Salary details are not yet available. Please contact HR or Payroll for assistance.' };
        }

        return {
          intentKey: 'salary',
          text: 'Here is your **salary summary**. For a detailed breakdown, download your payslip from the HR Portal.',
          richCard: {
            type: 'table',
            title: 'Salary Details',
            icon: 'fas fa-rupee-sign',
            rows
          }
        };
      }
    },

    // ── TRAINING ──────────────────────────────────────────────────────────
    {
      key: 'training',
      patterns: [/training|learning|course|enroll|lms|l&d|skill|certification|upskill/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const res = await firstValueFrom(this.svc.getMyEnrollments(empId));
        if (!res?.length) {
          return { intentKey: 'training', text: 'No training courses are currently assigned or available. Check back soon or contact your L&D team.' };
        }

        return {
          intentKey: 'training',
          text: `You have **${res.length} training course(s)** available. Click on any course in the LMS to continue.`,
          richCard: {
            type: 'training',
            title: 'My Training Courses',
            icon: 'fas fa-graduation-cap',
            items: res.slice(0, 5).map((t: EnrollmentItem) => ({
              icon: 'fas fa-play-circle',
              title: t.trainingTitle,
              subtitle: `${t.status || 'In Progress'}  ·  ${t.overallProgress ?? 0}% complete`
            }))
          }
        };
      }
    },

    // ── HOLIDAYS ──────────────────────────────────────────────────────────
    {
      key: 'holidays',
      patterns: [/holiday|public holiday|upcoming holiday|company holiday/i],
      handler: async (): Promise<BotResponse> => {
        const res = await firstValueFrom(this.svc.getHolidays());
        const holidays = res?.holidays;

        if (!holidays?.length) {
          return { intentKey: 'holidays', text: 'No holidays are listed for the current period. Check the HR Portal for the official calendar.' };
        }

        const upcoming = holidays
          .filter((h: HolidayItem) => new Date(h.date) >= new Date())
          .sort((a: HolidayItem, b: HolidayItem) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 6);

        const display = upcoming.length ? upcoming : holidays.slice(0, 6);

        return {
          intentKey: 'holidays',
          text: `Here are the **${display.length} upcoming holiday(s)** for your organisation.`,
          richCard: {
            type: 'table',
            title: 'Upcoming Holidays',
            icon: 'fas fa-umbrella-beach',
            rows: display.map((h: any) => ({
              label: h.description || h.name || 'Holiday',
              value: this.svc.formatDate(h.date),
              badge: h.day || '',
              badgeClass: 'badge-blue'
            }))
          }
        };
      }
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    {
      key: 'notifications',
      patterns: [/notification|alert|unread|pending.*notification/i],
      handler: async (): Promise<BotResponse> => {
        const empId = this.resolvedEmpId;
        if (!empId) return this.noEmpIdResponse();

        const [notifs, count] = await Promise.all([
          firstValueFrom(this.svc.getNotifications(empId)),
          firstValueFrom(this.svc.getUnreadCount(empId))
        ]);

        const unread = (notifs || []).filter(n => n.status === 'UNREAD').slice(0, 5);
        if (!unread.length) {
          return { intentKey: 'notifications', text: 'You have **no unread notifications** right now. You are all caught up!' };
        }

        return {
          intentKey: 'notifications',
          text: `You have **${count ?? unread.length} unread notification(s)**. Here are the latest ones.`,
          richCard: {
            type: 'list',
            title: 'Unread Notifications',
            icon: 'fas fa-bell',
            items: unread.map(n => ({
              icon: n.priority === 'URGENT' ? 'fas fa-exclamation-circle' :
                    n.priority === 'HIGH'   ? 'fas fa-bell'               : 'fas fa-info-circle',
              title: n.title,
              subtitle: `${n.message}  ·  ${this.svc.formatDate(n.createdAt)}`
            }))
          }
        };
      }
    },

    // ── EXTERNAL LINKS / RESOURCES ────────────────────────────────────────
    {
      key: 'resources',
      patterns: [/resource|link|useful|portal|pf|provident|insurance|esi|esic|epf|external link/i],
      handler: async (): Promise<BotResponse> => {
        const links = await firstValueFrom(this.svc.getExternalLinks());

        if (links?.length) {
          return {
            intentKey: 'resources',
            text: 'Here are the **useful resources** available for your organisation.',
            richCard: {
              type: 'links',
              title: 'Useful Resources',
              icon: 'fas fa-link',
              items: links.slice(0, 6).map(l => ({
                icon: 'fas fa-external-link-alt',
                title: l.linkName,
                subtitle: l.description || l.linkType || '',
                action: 'Open',
                actionUrl: l.url
              }))
            }
          };
        }

        return {
          intentKey: 'resources',
          text: 'Here are the standard government portals available for all employees.',
          richCard: {
            type: 'links',
            title: 'Useful Resources',
            icon: 'fas fa-link',
            items: [
              { icon: 'fas fa-university', title: 'EPFO / PF Portal', subtitle: 'Check PF balance, passbook, withdrawal',      action: 'Open', actionUrl: 'https://unifiedportal-mem.epfindia.gov.in' },
              { icon: 'fas fa-heartbeat',  title: 'ESI / Insurance',  subtitle: 'Health insurance, claims, hospital locator',   action: 'Open', actionUrl: 'https://www.esic.in' },
            ]
          }
        };
      }
    },

    // ── IT TICKET ─────────────────────────────────────────────────────────
    {
      key: 'it_ticket',
      patterns: [/ticket|raise.*ticket|it support|it issue|helpdesk|help desk|raise.*request|it request/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'it_ticket',
        text: 'To raise an **IT support ticket**, follow these steps. For urgent issues, call the **IT Helpline** directly.',
        richCard: {
          type: 'list',
          title: 'How to Raise an IT Ticket',
          icon: 'fas fa-ticket-alt',
          items: [
            { icon: 'fas fa-globe',       title: 'Go to IT Portal',    subtitle: 'Visit helpdesk.company.com or click IT Support in Useful Resources' },
            { icon: 'fas fa-plus-circle', title: 'Create New Ticket',  subtitle: 'Click "New Request" — select category: Hardware / Software / Network / Access' },
            { icon: 'fas fa-align-left',  title: 'Describe the Issue', subtitle: 'Add title, description, and attach screenshots if possible' },
            { icon: 'fas fa-paper-plane', title: 'Submit & Track',     subtitle: 'You will receive an email confirmation. Track status under "My Tickets"' },
          ]
        }
      })
    },

    // ── PAYSLIP DOWNLOAD ──────────────────────────────────────────────────
    {
      key: 'payslip',
      patterns: [/download.*payslip|payslip.*download|form 16|form16|tds|itr/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'payslip',
        text: 'You can download your **payslips and Form 16** from the HR Portal. Here is how:',
        richCard: {
          type: 'list',
          title: 'Download Payslip / Form 16',
          icon: 'fas fa-download',
          items: [
            { icon: 'fas fa-sign-in-alt', title: 'Login to HR Portal',        subtitle: 'Use your Employee ID and work email password' },
            { icon: 'fas fa-folder-open', title: 'Navigate to My Documents',  subtitle: 'Go to My Documents → Payslips or Tax Documents' },
            { icon: 'fas fa-file-pdf',    title: 'Download PDF',              subtitle: 'Select the month/year and click Download' },
          ]
        }
      })
    },

    // ── ONBOARDING ────────────────────────────────────────────────────────
    {
      key: 'onboarding',
      patterns: [/onboard|new joiner|induction|joining|first day|new employee/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'onboarding',
        text: 'Welcome! Here is your **onboarding checklist**. HR will also reach out within your first week.',
        richCard: {
          type: 'list',
          title: 'Onboarding Checklist',
          icon: 'fas fa-clipboard-check',
          items: [
            { icon: 'fas fa-id-card',   title: 'Submit KYC Documents',         subtitle: 'Aadhaar, PAN, Bank Details, Educational Certificates' },
            { icon: 'fas fa-laptop',    title: 'Set Up Workstation',            subtitle: 'Configure laptop, email, VPN and required software' },
            { icon: 'fas fa-handshake', title: 'Meet Your Team',                subtitle: 'HR will schedule introductions with your team and manager' },
            { icon: 'fas fa-book',      title: 'Complete Mandatory Training',   subtitle: 'Code of Conduct, Cybersecurity, and Data Privacy (LMS)' },
            { icon: 'fas fa-user-edit', title: 'Complete Your Profile',         subtitle: 'Fill in your personal details and upload a profile photo' },
          ]
        }
      })
    },

    // ── GREETING ──────────────────────────────────────────────────────────
    {
      key: 'greeting',
      patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|what'?s up|sup)[\s!?.,]*$/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'greeting',
        text: "Hi! I am **Lova**, your HR & IT Assistant. I can help you with:\n\n• Asset queries & IT tickets\n• Attendance & leave balance\n• Team information\n• Company Policies (AI Document Search)\n\nWhat can I help you with today?"
      })
    },

    // ── HELP ──────────────────────────────────────────────────────────────
    {
      key: 'help',
      patterns: [/help|what can you do|capabilities|commands|options/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'help',
        text: 'Here is everything I can help you with. **You can also ask me natural questions about company policies, and I will find the answers from the uploaded HR documents!**',
        richCard: {
          type: 'list',
          title: 'What I Can Help With',
          icon: 'fas fa-magic',
          items: [
            { icon: 'fas fa-file-pdf',       title: 'Policy AI Search',     subtitle: 'Ask natural questions about any company policy' },
            { icon: 'fas fa-box-open',       title: 'Assets & Equipment',   subtitle: 'View assigned assets, check status' },
            { icon: 'fas fa-exchange-alt',   title: 'Attendance',           subtitle: 'View swipe data, work hours, regularisation' },
            { icon: 'fas fa-calendar-check', title: 'Leave Management',     subtitle: 'Leave balance, requests, apply leave' },
            { icon: 'fas fa-users',          title: 'Team Directory',       subtitle: 'View team members and contact info' },
            { icon: 'fas fa-user-circle',    title: 'Profile & Payroll',    subtitle: 'Personal info, salary, CTC, payslips' },
            { icon: 'fas fa-graduation-cap', title: 'Training & L&D',       subtitle: 'Browse trainings, view enrollments, progress' },
            { icon: 'fas fa-umbrella-beach', title: 'Holidays',             subtitle: 'Upcoming company holidays' },
            { icon: 'fas fa-bell',           title: 'Notifications',        subtitle: 'Unread alerts and pending actions' },
          ]
        }
      })
    },

    // ── THANKS ────────────────────────────────────────────────────────────
    {
      key: 'thanks',
      patterns: [/thank|thanks|thank you|ty|great|perfect|awesome|cheers/i],
      handler: async (): Promise<BotResponse> => ({
        intentKey: 'thanks',
        text: 'You are welcome! Is there anything else I can help you with? Feel free to ask about assets, attendance, leave, or any company policy query.'
      })
    },
  ];

  // ─── Fallbacks ────────────────────────────────────────────────────────────
  private fallbacks: string[] = [
    'I am not sure about that query. Try asking about **assets**, **attendance**, **leave balance**, **salary**, or type **help** to see everything I can do.',
    'I could not find that information in your profile or in the company documents. Type **help** for a full list of what I can do.',
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.addWelcomeMessage();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void { /* no active subscriptions to clean up */ }

  // ─── Welcome ──────────────────────────────────────────────────────────────
  addWelcomeMessage(): void {
    this.messages.push({
      id: this.uid(),
      role: 'assistant',
      content: 'Hi! I am **Lova**, your HR & IT Assistant.\n\nI can help with assets, attendance, leave, payroll, team info, and IT tickets.\n\n**You can also ask me questions about company policies (like "What is the WFH policy?"), and I will search our HR documents to find the answer for you!**',
      timestamp: new Date()
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE  —  async, real API + AI Seamless Fallback
  // ═══════════════════════════════════════════════════════════════════════════

  async sendMessage(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    this.showWelcome = false;
    this.userInput   = '';
    this.inputRows   = 1;

    // Push user bubble
    this.messages.push({ id: this.uid(), role: 'user', content: text, timestamp: new Date() });
    this.shouldScrollToBottom = true;

    // Push streaming placeholder
    const streamMsg: ChatMessage = {
      id: this.uid(), role: 'assistant', content: '',
      timestamp: new Date(), isStreaming: true
    };
    this.messages.push(streamMsg);
    this.isLoading = true;
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();

    try {
      const response = await this.resolveIntentAsync(text);
      const last = this.messages[this.messages.length - 1];
      
      last.content     = response.text;
      last.richCard    = response.richCard;
      last.isStreaming = false;

      // Auto follow-up chips
      const intentKey = response.intentKey || 'fallback';
      last.followUps  = response.followUps || (FOLLOW_UP_MAP[intentKey] ?? FOLLOW_UP_MAP['fallback']);

    } catch {
      const last = this.messages[this.messages.length - 1];
      last.content     = 'Something went wrong while processing your request. Please try again in a moment.';
      last.isStreaming = false;
      last.followUps   = FOLLOW_UP_MAP['fallback'];
    } finally {
      this.isLoading            = false;
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    }
  }

  // ─── Async Intent Resolution + AI INTEGRATION ─────────────────────────────
  private async resolveIntentAsync(input: string): Promise<BotResponse> {
    
    // 1. Check Standard Structured Intents (Leave, Assets, Attendance, etc.)
    for (const intent of this.asyncIntents) {
      for (const pattern of intent.patterns) {
        if (pattern.test(input)) {
          const result = await intent.handler(input);
          return { ...result, intentKey: result.intentKey || intent.key };
        }
      }
    }

    // 2. If NO standard intent matched, seamlessly query the AI backend with uploaded HR documents
    try {
      const aiRes = await firstValueFrom(this.svc.askPolicyQuestion(input, this.currentAiSessionId));
      if (aiRes) {
        const answerText = aiRes.answer || aiRes.message || aiRes.response || (typeof aiRes === 'string' ? aiRes : null);
        
        if (answerText) {
          if (aiRes.sessionId) {
            this.currentAiSessionId = aiRes.sessionId; // Keep thread context for AI
          }
          return {
            text: answerText,
            intentKey: 'policy'
          };
        }
      }
    } catch (e) {
      console.error("AI Fallback Engine Error:", e);
    }

    // 3. Ultimate Fallback if AI fails or returns empty
    return {
      text: this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)],
      intentKey: 'fallback'
    };
  }

  private noEmpIdResponse(): BotResponse {
    return {
      text: 'I was unable to identify your employee ID. Please log in to the HR Portal, or contact HR for assistance.',
      intentKey: 'fallback'
    };
  }

  useQuickPrompt(prompt: string): void {
    this.userInput = prompt;
    this.sendMessage();
  }

  useFollowUp(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputChange(): void {
    const lines = (this.userInput.match(/\n/g) || []).length + 1;
    this.inputRows = Math.min(lines, 4);
  }

  clearChat(): void {
    this.messages    = [];
    this.showWelcome = true;
    this.currentAiSessionId = undefined; // Reset AI Context
    this.addWelcomeMessage();
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      setTimeout(() => this.inputField?.nativeElement?.focus(), 300);
    }
  }

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`(.*?)`/g,       '<code>$1</code>')
      .replace(/^•\s(.+)$/gm,    '<div class="bullet-item"><i class="fas fa-circle-small"></i>$1</div>')
      .replace(/\n\n/g,          '<br><br>')
      .replace(/\n/g,            '<br>');
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* noop */ }
  }

  private uid(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }
}