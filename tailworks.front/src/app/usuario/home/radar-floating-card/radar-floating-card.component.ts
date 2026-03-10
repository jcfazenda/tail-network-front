import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';

type FloatingCardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

@Component({
  standalone: true,
  selector: 'app-radar-floating-card',
  imports: [CommonModule],
  templateUrl: './radar-floating-card.component.html',
  styleUrls: ['./radar-floating-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarFloatingCardComponent implements AfterViewInit, OnDestroy {
  @Input() resizable = true;
  @Input() centerOnFirstRender = false;
  @Input() minWidth = 280;
  @Input() minHeight = 180;
  @Input() maxWidth = 640;
  @Input() maxHeight = 420;
  @Input() initialWidth = 348;
  @Input() initialHeight = 420;
  @Input() initialAnchorX = 0.5;
  @Input() initialAnchorY = 0.5;
  @Input() initialOffsetXPercent = -0.08;
  @Input() initialOffsetYPercent = -0.34;
  @Input() storageKey = '';
  @Input() dragHandleSelector = '.radar-floating-card__drag-handle';

  @ViewChild('cardElement', { static: true }) protected cardElement!: ElementRef<HTMLElement>;
  @ViewChild('contentElement', { static: true }) protected contentElement!: ElementRef<HTMLElement>;

  protected width = 348;
  protected height = 420;
  protected x = 0;
  protected y = 0;
  protected dragging = false;
  protected resizing = false;

  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;
  private resizePointerId: number | null = null;
  private dragPointerId: number | null = null;
  private cleanupDragHandles: Array<() => void> = [];
  private resizeObserver?: ResizeObserver;
  private hasStoredLayout = false;

  ngAfterViewInit(): void {
    this.width = this.clamp(this.initialWidth, this.minWidth, this.maxWidth);
    this.height = this.clamp(this.initialHeight, this.minHeight, this.maxHeight);

    const restored = this.readStoredLayout();
    this.hasStoredLayout = !!restored;
    if (restored) {
      if (this.resizable) {
        this.width = this.clamp(restored.width, this.minWidth, this.maxWidth);
        this.height = this.clamp(restored.height, this.minHeight, this.maxHeight);
      }
    }

    this.bindDragHandles();
    this.observeContainer();

    requestAnimationFrame(() => {
      this.repositionInitial(restored ?? undefined);

      // Recenter once more after layout settles to avoid first-load drift.
      if (!restored && this.centerOnFirstRender) {
        requestAnimationFrame(() => {
          this.repositionInitial();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupDragHandles.forEach((cleanup) => cleanup());
    this.resizeObserver?.disconnect();
  }

  protected startResize(event: PointerEvent): void {
    if (!this.resizable) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizePointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.resizeStartWidth = this.width;
    this.resizeStartHeight = this.height;
  }

  @HostListener('document:pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging && this.dragPointerId === event.pointerId) {
      const nextX = this.dragOriginX + (event.clientX - this.dragStartX);
      const nextY = this.dragOriginY + (event.clientY - this.dragStartY);
      this.applyPosition(nextX, nextY);
      return;
    }

    if (this.resizing && this.resizePointerId === event.pointerId) {
      const nextWidth = this.resizeStartWidth + (event.clientX - this.dragStartX);
      const nextHeight = this.resizeStartHeight + (event.clientY - this.dragStartY);
      this.applySize(nextWidth, nextHeight);
    }
  }

  @HostListener('document:pointerup', ['$event'])
  protected onPointerUp(event: PointerEvent): void {
    if (this.dragging && this.dragPointerId === event.pointerId) {
      this.dragging = false;
      this.dragPointerId = null;
      this.storeLayout();
    }

    if (this.resizing && this.resizePointerId === event.pointerId) {
      this.resizing = false;
      this.resizePointerId = null;
      this.storeLayout();
    }
  }

  @HostListener('document:pointercancel', ['$event'])
  protected onPointerCancel(event: PointerEvent): void {
    this.onPointerUp(event);
  }

  private bindDragHandles(): void {
    const handles = this.contentElement.nativeElement.querySelectorAll<HTMLElement>(this.dragHandleSelector);

    handles.forEach((handle) => {
      const listener = (event: PointerEvent) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        this.dragging = true;
        this.dragPointerId = event.pointerId;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.dragOriginX = this.x;
        this.dragOriginY = this.y;
      };

      handle.addEventListener('pointerdown', listener);
      this.cleanupDragHandles.push(() => handle.removeEventListener('pointerdown', listener));
    });
  }

  private repositionInitial(restored?: FloatingCardLayout): void {
    if (restored) {
      this.applyPosition(restored.x, restored.y);
      return;
    }

    if (this.centerOnFirstRender) {
      this.centerCard();
      return;
    }

    const container = this.getContainer();
    const nextX = container.clientWidth * this.initialAnchorX + this.width * this.initialOffsetXPercent;
    const nextY = container.clientHeight * this.initialAnchorY + this.height * this.initialOffsetYPercent;
    this.applyPosition(nextX, nextY);
  }

  private observeContainer(): void {
    const container = this.getContainer();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.applySize(this.width, this.height);
      if (!this.hasStoredLayout && this.centerOnFirstRender && !this.dragging) {
        this.centerCard();
        return;
      }
      this.applyPosition(this.x, this.y);
    });

    this.resizeObserver.observe(container);
  }

  private applyPosition(nextX: number, nextY: number): void {
    const container = this.getContainer();
    const maxX = Math.max(0, container.clientWidth - this.width);
    const maxY = Math.max(0, container.clientHeight - this.height);

    this.x = this.clamp(nextX, 0, maxX);
    this.y = this.clamp(nextY, 0, maxY);
  }

  private applySize(nextWidth: number, nextHeight: number): void {
    const container = this.getContainer();
    const boundedWidth = this.clamp(nextWidth, this.minWidth, Math.min(this.maxWidth, container.clientWidth));
    const boundedHeight = this.clamp(nextHeight, this.minHeight, Math.min(this.maxHeight, container.clientHeight));

    this.width = boundedWidth;
    this.height = boundedHeight;
    this.applyPosition(this.x, this.y);
  }

  private centerCard(): void {
    const container = this.getContainer();
    const nextX = (container.clientWidth - this.width) / 2;
    const nextY = (container.clientHeight - this.height) / 2;
    this.applyPosition(nextX, nextY);
  }

  private storeLayout(): void {
    if (!this.storageKey || typeof window === 'undefined') {
      return;
    }

    const layout: FloatingCardLayout = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };

    window.localStorage.setItem(this.storageKey, JSON.stringify(layout));
  }

  private readStoredLayout(): FloatingCardLayout | null {
    if (!this.storageKey || typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<FloatingCardLayout>;
      if (
        typeof parsed.x !== 'number' ||
        typeof parsed.y !== 'number' ||
        typeof parsed.width !== 'number' ||
        typeof parsed.height !== 'number'
      ) {
        return null;
      }
      return parsed as FloatingCardLayout;
    } catch {
      return null;
    }
  }

  private getContainer(): HTMLElement {
    return (this.cardElement.nativeElement.offsetParent as HTMLElement) ?? this.cardElement.nativeElement.parentElement!;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
