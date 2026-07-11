/**
 * Contenido legal (aviso legal + política de privacidad + nota de almacenamiento)
 * por idioma. Texto sobrio y específico; RGPD + LSSI-CE. Proyecto sin ánimo de
 * lucro: no vende datos, no hace marketing ni perfilado.
 */

import type { Locale } from '@/lib/i18n/config';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}
export interface LegalContent {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  disclaimer: string;
}

const CONTACT = 'contacto@incendib.es';

const es: LegalContent = {
  title: 'Aviso legal y privacidad',
  updated: 'Actualizado: julio de 2026',
  intro:
    'Incendib es un proyecto personal sin ánimo de lucro que agrega y muestra información pública de incendios forestales en España y Portugal. No vende datos, no hace marketing ni elabora perfiles.',
  sections: [
    {
      heading: 'Responsable',
      paragraphs: [
        'Responsable del sitio: David Moreno Romero.',
        `Contacto: ${CONTACT}.`,
        'Naturaleza: proyecto personal, informativo y sin ánimo de lucro. Incendib no es un canal oficial de emergencias y no sustituye al 112.',
      ],
    },
    {
      heading: 'Datos que tratamos',
      paragraphs: [
        'Notificaciones (Web Push): si las activas, tu navegador crea una suscripción —un identificador técnico— que guardamos únicamente para enviarte los avisos que has pedido. La base legal es tu consentimiento, que puedes retirar en cualquier momento desactivando las notificaciones.',
        'Ubicación: si usas «usar mi ubicación» para fijar el radio de alerta, esa posición se guarda solo en tu dispositivo (almacenamiento local) y no se envía a nuestros servidores.',
        'Preferencias: el tema, el idioma y los ajustes de alertas se guardan en el almacenamiento local de tu navegador para recordarlos entre visitas.',
        'Datos técnicos: para servir la web y su seguridad se procesan de forma transitoria la dirección IP y registros de acceso (interés legítimo). Las estadísticas de uso son agregadas y sin cookies y no permiten identificarte.',
      ],
    },
    {
      heading: 'Cookies y almacenamiento',
      paragraphs: [
        'Incendib no usa cookies de rastreo ni de publicidad. Solo emplea almacenamiento técnico necesario para su funcionamiento (tus preferencias, la caché para uso sin conexión y la suscripción de notificaciones), exento de consentimiento según la normativa. Por eso no verás un banner de cookies.',
      ],
    },
    {
      heading: 'Con quién se comparten',
      paragraphs: [
        'Alojamiento: Vercel Inc., como encargado del tratamiento, con garantías contractuales para las transferencias internacionales.',
        'Entrega de notificaciones: los servicios de push del navegador (Google, Mozilla o Apple) reciben el aviso para hacerlo llegar a tu dispositivo.',
        'No compartimos, vendemos ni cedemos datos con fines comerciales, publicitarios o de perfilado.',
      ],
    },
    {
      heading: 'Conservación',
      paragraphs: [
        'Las suscripciones de notificaciones se eliminan cuando desactivas los avisos o cuando el servicio de push indica que han caducado. Las preferencias permanecen en tu navegador hasta que borres los datos del sitio.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        `Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar tu consentimiento, escribiendo a ${CONTACT}.`,
        'Si consideras que no se han atendido, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
      ],
    },
    {
      heading: 'Fuentes y licencias',
      paragraphs: [
        'Los datos de incendios proceden de fuentes oficiales o abiertas (EFFIS/Copernicus, NASA FIRMS, fogos.pt/ANEPC, JCyL/INFORCYL, INFOCA, Bombers de la Generalitat, AEMET/IPMA), con su atribución y licencia detalladas en la pantalla «Fuentes».',
      ],
    },
  ],
  disclaimer: 'No sustituye a los canales oficiales de emergencia. Emergencias: 112.',
};

const pt: LegalContent = {
  title: 'Aviso legal e privacidade',
  updated: 'Atualizado: julho de 2026',
  intro:
    'O Incendib é um projeto pessoal sem fins lucrativos que agrega e mostra informação pública de incêndios florestais em Espanha e Portugal. Não vende dados, não faz marketing nem elabora perfis.',
  sections: [
    {
      heading: 'Responsável',
      paragraphs: [
        'Responsável do site: David Moreno Romero.',
        `Contacto: ${CONTACT}.`,
        'Natureza: projeto pessoal, informativo e sem fins lucrativos. O Incendib não é um canal oficial de emergências e não substitui o 112.',
      ],
    },
    {
      heading: 'Dados que tratamos',
      paragraphs: [
        'Notificações (Web Push): se as ativares, o teu navegador cria uma subscrição —um identificador técnico— que guardamos apenas para te enviar os avisos que pediste. A base legal é o teu consentimento, que podes retirar a qualquer momento desativando as notificações.',
        'Localização: se usares «usar a minha localização» para definir o raio de alerta, essa posição fica guardada apenas no teu dispositivo (armazenamento local) e não é enviada aos nossos servidores.',
        'Preferências: o tema, o idioma e as definições de alertas são guardados no armazenamento local do teu navegador para os recordar entre visitas.',
        'Dados técnicos: para servir o site e a sua segurança processam-se de forma transitória o endereço IP e registos de acesso (interesse legítimo). As estatísticas de uso são agregadas e sem cookies e não permitem identificar-te.',
      ],
    },
    {
      heading: 'Cookies e armazenamento',
      paragraphs: [
        'O Incendib não usa cookies de rastreio nem de publicidade. Só utiliza armazenamento técnico necessário para funcionar (as tuas preferências, a cache para uso offline e a subscrição de notificações), isento de consentimento segundo a lei. Por isso não verás um banner de cookies.',
      ],
    },
    {
      heading: 'Com quem são partilhados',
      paragraphs: [
        'Alojamento: Vercel Inc., como subcontratante, com garantias contratuais para as transferências internacionais.',
        'Entrega de notificações: os serviços de push do navegador (Google, Mozilla ou Apple) recebem o aviso para o fazer chegar ao teu dispositivo.',
        'Não partilhamos, vendemos nem cedemos dados para fins comerciais, publicitários ou de definição de perfis.',
      ],
    },
    {
      heading: 'Conservação',
      paragraphs: [
        'As subscrições de notificações são eliminadas quando desativas os avisos ou quando o serviço de push indica que caducaram. As preferências permanecem no teu navegador até que apagues os dados do site.',
      ],
    },
    {
      heading: 'Os teus direitos',
      paragraphs: [
        `Podes exercer os direitos de acesso, retificação, apagamento, oposição, limitação e portabilidade, e retirar o consentimento, escrevendo para ${CONTACT}.`,
        'Se considerares que não foram atendidos, podes reclamar junto da autoridade de proteção de dados competente (em Portugal, a CNPD; em Espanha, a AEPD).',
      ],
    },
    {
      heading: 'Fontes e licenças',
      paragraphs: [
        'Os dados de incêndios provêm de fontes oficiais ou abertas (EFFIS/Copernicus, NASA FIRMS, fogos.pt/ANEPC, JCyL/INFORCYL, INFOCA, Bombers de la Generalitat, AEMET/IPMA), com a atribuição e licença detalhadas no ecrã «Fontes».',
      ],
    },
  ],
  disclaimer: 'Não substitui os canais oficiais de emergência. Emergências: 112.',
};

const en: LegalContent = {
  title: 'Legal notice & privacy',
  updated: 'Updated: July 2026',
  intro:
    'Incendib is a personal, non-profit project that aggregates and displays public wildfire information for Spain and Portugal. It does not sell data, run marketing, or build profiles.',
  sections: [
    {
      heading: 'Who is responsible',
      paragraphs: [
        'Site owner: David Moreno Romero.',
        `Contact: ${CONTACT}.`,
        'Nature: a personal, informational, non-profit project. Incendib is not an official emergency channel and does not replace 112.',
      ],
    },
    {
      heading: 'Data we process',
      paragraphs: [
        'Notifications (Web Push): if you enable them, your browser creates a subscription —a technical identifier— that we store only to send you the alerts you asked for. The legal basis is your consent, which you can withdraw at any time by turning notifications off.',
        'Location: if you use “use my location” to set the alert radius, that position is stored only on your device (local storage) and is not sent to our servers.',
        'Preferences: theme, language and alert settings are kept in your browser’s local storage to remember them between visits.',
        'Technical data: to serve the site and its security, the IP address and access logs are processed transiently (legitimate interest). Usage statistics are aggregated and cookieless and cannot identify you.',
      ],
    },
    {
      heading: 'Cookies & storage',
      paragraphs: [
        'Incendib uses no tracking or advertising cookies. It only uses technical storage necessary to work (your preferences, the offline cache and the notification subscription), which is exempt from consent under the law. That is why you will not see a cookie banner.',
      ],
    },
    {
      heading: 'Who we share with',
      paragraphs: [
        'Hosting: Vercel Inc., as a data processor, with contractual safeguards for international transfers.',
        'Notification delivery: the browser push services (Google, Mozilla or Apple) receive the alert to deliver it to your device.',
        'We do not share, sell or transfer data for commercial, advertising or profiling purposes.',
      ],
    },
    {
      heading: 'Retention',
      paragraphs: [
        'Notification subscriptions are deleted when you disable alerts or when the push service reports them as expired. Preferences remain in your browser until you clear the site data.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        `You can exercise the rights of access, rectification, erasure, objection, restriction and portability, and withdraw consent, by writing to ${CONTACT}.`,
        'If your request is not handled, you may lodge a complaint with the competent data protection authority (in Spain, the AEPD; in Portugal, the CNPD).',
      ],
    },
    {
      heading: 'Sources & licences',
      paragraphs: [
        'Fire data comes from official or open sources (EFFIS/Copernicus, NASA FIRMS, fogos.pt/ANEPC, JCyL/INFORCYL, INFOCA, Bombers de la Generalitat, AEMET/IPMA), with attribution and licence detailed on the “Sources” screen.',
      ],
    },
  ],
  disclaimer: 'This does not replace official emergency channels. Emergencies: 112.',
};

export const LEGAL: Record<Locale, LegalContent> = { es, pt, en };
