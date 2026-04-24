import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  // 1. Toast Configuration (Notifications - Top Right)
  private toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000, // Time badha diya hai (3s se 5s)
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  // 2. Center Alert Configuration (Confirmation Modal - Center Screen)
  private centerAlert = Swal.mixin({
    position: 'center',
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonColor: '#4f46e5', // Brand Primary Color for consistency
    cancelButtonColor: '#64748B',
    heightAuto: false,
    customClass: {
      popup: 'animated fadeInDown'
    }
  });

  // --- Methods ---

  success(message: string, title: string = 'Success') {
    this.toast.fire({ icon: 'success', title: title, text: message });
  }
  
  error(message: string, title: string = 'Error') {
    this.toast.fire({ icon: 'error', title: title, text: message });
  }

  warning(message: string, title: string = 'Warning') {
    this.toast.fire({ icon: 'warning', title: title, text: message });
  }

  info(message: string, title: string = 'Info') {
    this.toast.fire({ icon: 'info', title: title, text: message });
  }

  // Promise-based confirm dialog
  async confirm(title: string, text: string, confirmButtonText: string = 'Yes, Proceed'): Promise<boolean> {
    const result = await this.centerAlert.fire({
      icon: 'question',
      title: title,
      text: text,
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Cancel'
    });
    return result.isConfirmed;
  }
}