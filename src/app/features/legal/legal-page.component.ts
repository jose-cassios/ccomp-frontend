import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type LegalDocumentKey = 'terms' | 'privacy';

interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

interface LegalDocument {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LAST_UPDATED = '20 de setembro de 2026';

const DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    eyebrow: 'Uso responsável da plataforma',
    title: 'Termos de uso',
    description: 'Condições para acesso e participação na Plataforma CCOMP, o ambiente digital do curso de Ciência da Computação do IFMA Campus Caxias.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: '1. Aceitação e alcance',
        paragraphs: [
          'Ao acessar ou utilizar a Plataforma CCOMP, você concorda com estes Termos de Uso e com a Política de Privacidade. Caso não concorde com alguma condição, não utilize os recursos que dependem dela.',
          'Estes termos se aplicam ao site, às contas de usuário e aos recursos acadêmicos, comunitários e de divulgação oferecidos pela CCOMP.',
        ],
      },
      {
        title: '2. Contas e acesso',
        paragraphs: [
          'Parte do conteúdo é pública. Recursos como inscrições, criação e edição de eventos, notícias e clubes podem exigir uma conta e permissões específicas.',
          'Você deve fornecer informações verdadeiras, manter suas credenciais em sigilo e informar pelo canal de contato caso suspeite de uso indevido da conta. A atribuição de permissões é feita conforme as regras administrativas da plataforma.',
        ],
      },
      {
        title: '3. Uso adequado',
        paragraphs: ['A plataforma deve ser utilizada para fins acadêmicos, informativos e comunitários, de modo respeitoso e em conformidade com a legislação aplicável.'],
        items: [
          'Não praticar atividade ilegal, fraudulenta ou que viole direitos de terceiros.',
          'Não publicar conteúdo discriminatório, violento, assediante, ilícito ou que incentive violação de direitos humanos.',
          'Não tentar comprometer a segurança, disponibilidade ou integridade do site, das contas, dos dados ou da infraestrutura.',
          'Não usar automações, coleta massiva de dados ou mecanismos que prejudiquem o funcionamento normal da plataforma sem autorização.',
        ],
      },
      {
        title: '4. Conteúdo e propriedade intelectual',
        paragraphs: [
          'Textos, imagens, identidades visuais, programas e demais materiais da Plataforma CCOMP são protegidos pela legislação aplicável ou utilizados com autorização. O acesso concede uma licença limitada, pessoal, não exclusiva e não comercial para visualização do conteúdo.',
          'Quem envia conteúdo declara possuir os direitos ou autorizações necessários. Ao publicar na plataforma, autoriza sua exibição e organização dentro dos recursos relacionados ao curso, preservados os direitos previstos em lei.',
        ],
      },
      {
        title: '5. Eventos, notícias e clubes',
        paragraphs: [
          'As pessoas responsáveis por conteúdo publicado devem manter as informações corretas, atualizadas e adequadas ao propósito do recurso. Inscrições, vagas, horários e regras de participação podem ser definidos pela organização de cada evento ou clube.',
          'A CCOMP pode corrigir, restringir ou remover conteúdo que contrarie estes termos, a legislação ou a finalidade acadêmica da plataforma, observadas as regras institucionais aplicáveis.',
        ],
      },
      {
        title: '6. Privacidade e segurança',
        paragraphs: [
          'O tratamento de dados pessoais segue as informações apresentadas na Política de Privacidade. Recomendamos utilizar senha forte, não compartilhar códigos de acesso e encerrar a sessão ao usar dispositivos compartilhados.',
          'Adotamos medidas razoáveis para proteger a plataforma, mas nenhum ambiente digital está livre de riscos. Em caso de suspeita de incidente, entre em contato conosco imediatamente.',
        ],
      },
      {
        title: '7. Links externos e disponibilidade',
        paragraphs: [
          'A plataforma pode apontar para páginas externas. Cada serviço externo possui seus próprios termos e práticas de privacidade, pelos quais a CCOMP não é responsável.',
          'Podemos realizar manutenção, atualizar funcionalidades ou interromper recursos quando necessário. Sempre que viável, alterações relevantes serão comunicadas pelos canais da plataforma.',
        ],
      },
      {
        title: '8. Atualizações e contato',
        paragraphs: [
          'Estes termos podem ser atualizados para refletir mudanças nos serviços, nas regras institucionais ou na legislação. A versão vigente estará sempre disponível nesta página.',
          'Dúvidas, solicitações ou relatos podem ser enviados para ccomp.ifma.edu.cx@gmail.com.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Transparência sobre dados pessoais',
    title: 'Política de privacidade',
    description: 'Como a Plataforma CCOMP trata dados pessoais para oferecer recursos acadêmicos, comunitários e de gestão do curso.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: '1. Nosso compromisso',
        paragraphs: [
          'A CCOMP busca tratar dados pessoais de forma transparente, proporcional e compatível com as finalidades informadas nesta política e com a Lei Geral de Proteção de Dados Pessoais (LGPD).',
          'Esta política abrange o site, as contas, inscrições, publicações e demais interações realizadas na Plataforma CCOMP.',
        ],
      },
      {
        title: '2. Dados que podem ser tratados',
        paragraphs: ['Os dados variam conforme os recursos utilizados e podem incluir:'],
        items: [
          'dados de cadastro e perfil, como nome, endereço de e-mail e função de acesso;',
          'dados de autenticação e sessão, necessários para manter o acesso à conta;',
          'informações fornecidas em inscrições de eventos, participação em atividades e clubes;',
          'conteúdos publicados ou administrados por você, como notícias, eventos, imagens e informações de clubes;',
          'registros técnicos necessários à segurança, prevenção de falhas e funcionamento dos serviços.',
        ],
      },
      {
        title: '3. Finalidades do tratamento',
        paragraphs: ['Utilizamos dados pessoais quando necessário para:'],
        items: [
          'criar e administrar contas, permissões e sessões autenticadas;',
          'viabilizar inscrições, atividades, comunicação de convites e recuperação de acesso;',
          'publicar e organizar informações acadêmicas, eventos, notícias e clubes;',
          'proteger a plataforma, prevenir abuso e atender obrigações legais ou institucionais;',
          'aperfeiçoar a estabilidade e a experiência de uso dos recursos oferecidos.',
        ],
      },
      {
        title: '4. Bases legais',
        paragraphs: [
          'O tratamento é realizado conforme as hipóteses legais aplicáveis à atividade, que podem incluir execução de procedimentos solicitados por você, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, interesse legítimo e consentimento quando exigido.',
          'Quando o consentimento for a base aplicável, ele poderá ser revogado pelos canais disponibilizados, sem prejuízo dos tratamentos realizados anteriormente de forma válida.',
        ],
      },
      {
        title: '5. Armazenamento local, cookies e serviços externos',
        paragraphs: [
          'Para manter a sessão autenticada, a versão atual do site armazena no navegador dados de sessão e informações básicas de perfil. Ao sair da conta, esses dados locais são removidos pelo aplicativo; em dispositivos compartilhados, recomendamos sempre realizar o logout.',
          'Não utilizamos, nesta versão do frontend, scripts de publicidade comportamental. Caso recursos não essenciais, como análises de audiência ou novas integrações, sejam adotados, esta política e os mecanismos de escolha aplicáveis serão atualizados antes da ativação.',
          'Hospedagem, armazenamento de arquivos e outros fornecedores técnicos podem tratar dados apenas na medida necessária para operar os serviços e conforme as obrigações aplicáveis.',
        ],
      },
      {
        title: '6. Compartilhamento e conservação',
        paragraphs: [
          'Não comercializamos dados pessoais. O compartilhamento pode ocorrer com fornecedores necessários à operação da plataforma, responsáveis por eventos ou clubes quando a participação exigir essa informação, e autoridades competentes quando houver obrigação legal.',
          'Os dados são conservados pelo período necessário às finalidades informadas, à continuidade do serviço e ao cumprimento de deveres legais, administrativos ou de segurança. Após isso, podem ser eliminados, anonimizados ou mantidos nas hipóteses permitidas por lei.',
        ],
      },
      {
        title: '7. Seus direitos',
        paragraphs: [
          'Nos termos da LGPD, você pode solicitar informações sobre o tratamento de seus dados e, quando aplicável, confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamentos, revogação de consentimento e oposição.',
          'Alguns pedidos podem ter limites ou exigir retenção de dados quando houver obrigação legal, segurança da plataforma ou outra hipótese prevista em lei. Explicaremos a razão caso não seja possível atender integralmente uma solicitação.',
        ],
      },
      {
        title: '8. Segurança e links externos',
        paragraphs: [
          'Aplicamos medidas técnicas e organizacionais razoáveis para reduzir riscos de acesso, alteração, perda ou divulgação não autorizados. Nenhum sistema, porém, é absolutamente imune a incidentes.',
          'Links para sites externos seguem as políticas dos respectivos responsáveis. Recomendamos revisar as condições desses serviços antes de fornecer informações pessoais.',
        ],
      },
      {
        title: '9. Contato e atualizações',
        paragraphs: [
          'Para exercer direitos, esclarecer dúvidas ou relatar uma preocupação de privacidade, entre em contato pelo e-mail ccomp.ifma.edu.cx@gmail.com. Procure informar o máximo de contexto possível para que possamos identificar sua solicitação com segurança.',
          'Esta política pode ser atualizada para acompanhar mudanças nos recursos, nas operações ou na legislação. A data de atualização exibida nesta página indica a versão vigente.',
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.css',
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly document = computed(() => {
    const key = this.route.snapshot.data['legalDocument'];
    return DOCUMENTS[key === 'privacy' ? 'privacy' : 'terms'];
  });
}
