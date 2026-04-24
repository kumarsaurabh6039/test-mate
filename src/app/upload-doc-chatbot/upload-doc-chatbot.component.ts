import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, PolicyDocument } from '../services/chatbot.service';

@Component({
  selector: 'app-upload-doc-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-doc-chatbot.component.html',
  styleUrls: ['./upload-doc-chatbot.component.css']
})
export class UploadDocChatbotComponent implements OnInit {
  private chatbotService = inject(ChatbotService);

  documents: PolicyDocument[] = [];
  isLoadingDocs: boolean = false;
  isUploading: boolean = false;
  selectedFile: File | null = null;
  uploadMessage: string | null = null;
  uploadError: string | null = null;

  ngOnInit(): void {
    this.fetchDocuments();
  }

  fetchDocuments(): void {
    this.isLoadingDocs = true;
    this.chatbotService.getPolicyDocuments().subscribe({
      next: (docs) => {
        if (docs) {
          this.documents = docs;
        }
        this.isLoadingDocs = false;
      },
      error: (err) => {
        console.error("Error fetching policy docs", err);
        this.isLoadingDocs = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadMessage = null;
      this.uploadError = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadMessage = null;
    this.uploadError = null;

    this.chatbotService.uploadPolicyDocument(this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res) {
          this.uploadMessage = "Document uploaded successfully! The AI Chatbot is now learning from it.";
          this.selectedFile = null;
          this.fetchDocuments(); // Refresh list
        } else {
          this.uploadError = "Upload failed. Please try again.";
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadError = "An error occurred during upload.";
      }
    });
  }

  formatDate(isoString: string): string {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}