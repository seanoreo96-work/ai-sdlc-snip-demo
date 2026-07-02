import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { LinkService, Link } from './link.service';

@Component({
  selector: 'app-root',
  imports: [DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly svc = inject(LinkService);

  url = signal('');
  links = signal<Link[]>([]);
  newLink = signal<Link | null>(null);
  error = signal('');
  loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.svc.getAll().subscribe({
      next: (all) => this.links.set(all),
    });
  }

  isValidUrl(raw: string): boolean {
    try {
      const { protocol } = new URL(raw);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }

  shorten(): void {
    const raw = this.url().trim();
    if (!this.isValidUrl(raw)) {
      this.error.set('Please enter a valid http or https URL.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.newLink.set(null);

    this.svc.shorten(raw).subscribe({
      next: (link) => {
        this.newLink.set(link);
        this.url.set('');
        this.loading.set(false);
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? err.message ?? 'Request failed.');
        this.loading.set(false);
      },
    });
  }
}
