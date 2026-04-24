import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * SafePipe — kept for any other use in the app.
 *
 * NOTE: This pipe is NO LONGER used in paper-boats.component.html for PDF preview.
 * PDF sanitization is now done directly in the component via DomSanitizer,
 * which prevents Angular change detection from re-evaluating the blob: URL
 * on every cycle (which caused the blank iframe bug).
 *
 * Usage (elsewhere): [src]="someUrl | safe"
 *
 * Register in your module's declarations array:
 *   import { SafePipe } from './pipes/safe.pipe';
 *   declarations: [ ..., SafePipe ]
 */
@Pipe({ name: 'safe' })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string | null): SafeResourceUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
