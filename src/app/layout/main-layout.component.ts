import { Component } from '@angular/core';
import { Header } from "./header/header";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-main-layout.component',
  imports: [Header, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {

}
