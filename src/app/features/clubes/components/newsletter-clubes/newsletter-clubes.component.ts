import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-newsletter-clubes',
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter-clubes.component.html',
  styleUrl: './newsletter-clubes.component.css',
})
export class NewsletterClubesComponent {

  email='';
  enviado= false;
  erro=false;

  @Output() inscricao = new EventEmitter<string>();

  assinar(): void{
    if(!this.email || !this.email.includes('@')){
      this.erro = true;
      return;
    }

    this.erro = false;
    this.inscricao.emit(this.email);
    this.enviado = true;

    setTimeout(() =>{
      this.enviado = false;
      this.email ='';
    }, 3000);
  }
}
