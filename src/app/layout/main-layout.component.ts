import { Component } from '@angular/core';
import { Header } from "./header/header";
import { RouterOutlet } from "@angular/router";
import { Footer } from "./footer/footer";

@Component({
  selector: 'app-main-layout.component',
  imports: [Header, RouterOutlet, Footer],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {

}
