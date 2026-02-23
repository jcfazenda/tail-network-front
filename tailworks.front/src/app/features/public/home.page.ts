import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';  
import { StartModalService } from '../../core/ui/start-role-modal/start-modal.service';

type HomeSlide = {
  chip: string;
  title: string;
  subtitle: string;
  image: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  private startModal = inject(StartModalService);
  private router = inject(Router);

  current = 0;
  private timer?: number;
  paused = false;

  slides: HomeSlide[] = [
    {
      chip: 'Explore o radar da sua carreira',
      title: 'Aqui sua carreira deixa de ser perfil e vira sistema.',
      subtitle: 'Transforme sua carreira em reputação mensurável.',
      image: '/assets/tail-hero3.png',
    },
    {
      chip: 'Aderência real à vaga',
      title: 'Aderência real à vaga.',
      subtitle: 'Radar profissional contínuo para Recruiters e Talentos.',
      image: '/assets/tail-hero3.png',
    },
    {
      chip: 'Career OS para TI',
      title: 'Conecte-se • Evolua • Cresça',
      subtitle: 'O sistema operacional da carreira em TI.',
      image: '/assets/tail-hero3.png',
    },
  ];

  ngOnInit(): void {
    this.startAuto();
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }
 

openStart(): void {
  this.startModal.open();

  console.log('open start');
}

  startAuto(): void {
    this.stopAuto();
    this.timer = window.setInterval(() => {
      if (!this.paused) this.next();
    }, 6000);
  }

  stopAuto(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  next(): void {
    this.current = (this.current + 1) % this.slides.length;
  }

  prev(): void {
    this.current = (this.current - 1 + this.slides.length) % this.slides.length;
  }

  goTo(i: number): void {
    this.current = i;
  }

  onEnter(): void {
    this.paused = true;
  }

  onLeave(): void {
    this.paused = false;
  }

  goRecruiter(): void {
  this.router.navigate(['/recruiter']);
}

goTalent(): void {
  this.router.navigate(['/talent']);
}
}