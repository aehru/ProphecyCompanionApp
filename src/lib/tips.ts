/**
 * « Astuces » — one-shot hints shown the first time a screen is opened, for a
 * player who knows Prophecy but not this app. They explain the UI, never the
 * rules. A dismissed tip's id is remembered on the device (see use-tips); « Revoir
 * les astuces » in Plus forgets them all.
 *
 * Adding a tip is one line here; a new screen also needs a `<TipCard screen>`.
 */
export type TipScreen =
  | 'fiche'
  | 'initiative'
  | 'pager'
  | 'inventory'
  | 'roller'
  | 'catalog'
  | 'manoeuvres'
  | 'enchant';

export type Tip = { id: string; screen: TipScreen; title: string; body: string };

export const TIPS: readonly Tip[] = [
  {
    id: 'fiche-edit',
    screen: 'fiche',
    title: 'Lecture et édition',
    body: 'Le bouton crayon, en bas à droite, passe la fiche en édition. Chaque changement est enregistré aussitôt : rien à valider.',
  },
  {
    id: 'fiche-roll',
    screen: 'fiche',
    title: 'Lancer depuis la fiche',
    body: 'Touchez un attribut ou une caractéristique pour ouvrir le lanceur de dés avec la bonne valeur, blessures et effets compris.',
  },
  {
    id: 'fiche-effects',
    screen: 'fiche',
    title: 'Effets temporaires',
    body: 'Un bonus ou un malus s’ajoute dans « Effets », avec sa durée. En édition, « Temps écoulé » décompte les durées d’une unité.',
  },
  {
    id: 'initiative-spend',
    screen: 'initiative',
    title: 'Dépenser un dé',
    body: 'Touchez un dé pour le dépenser : Attaque, Défense ou Autre. Une attaque et une défense par tour sont gratuites ; chacune de plus ajoute +5 à la Difficulté, que le lanceur applique tout seul.',
  },
  {
    id: 'initiative-wounds',
    screen: 'initiative',
    title: 'Dés et blessures',
    body: 'Le malus de blessures s’applique à chaque dé. Un dé pas encore joué qui tombe à 0 est perdu ; un dé déjà dépensé garde la valeur à laquelle il a été joué.',
  },
  {
    id: 'initiative-edit',
    screen: 'initiative',
    title: 'Relancer, ajouter, marquer',
    body: 'L’icône de dé de la section relance l’initiative et libère tous les dés. Son crayon ajoute ou retire des dés supplémentaires et pose un repère sur un dé, simple mémo sans règle.',
  },
  {
    id: 'pager-swipe',
    screen: 'pager',
    title: 'Onglets',
    body: 'Balayez de gauche à droite pour changer d’onglet. La loupe cherche dans toutes les compétences à la fois.',
  },
  {
    id: 'inventory-tabs',
    screen: 'inventory',
    title: 'Inventaire',
    body: 'Armes, armures, boucliers et objets ont chacun leur onglet ; le bouton en bas à droite ajoute dans l’onglet affiché. Touchez le total d’une arme pour lancer son attaque.',
  },
  {
    id: 'roller-tendances',
    screen: 'roller',
    title: 'Les Tendances',
    body: '« Tendances » lance le Dragon, l’Homme et la Fatalité : c’est vous qui choisissez le dé que vous gardez.',
  },
  {
    id: 'roller-crit',
    screen: 'roller',
    title: 'Critiques et échecs',
    body: 'Un seul dé peut faire un critique ou un échec critique : celui gardé, ou le premier lancé quand les dés s’additionnent. La relance confirme, elle ne s’ajoute pas.',
  },
  {
    id: 'roller-cast',
    screen: 'roller',
    title: 'Sortilèges',
    body: 'Un sort lancé sur les Tendances parle de Miracle et de Contrecoup : un 10 ou un 1 sur un dé écarté peut aussi provoquer un Contrecoup.',
  },
  {
    id: 'catalog-add',
    screen: 'catalog',
    title: 'Catalogue',
    body: 'Le « + » d’une ligne ajoute l’entrée du livre de règles à votre personnage ; la première ligne permet de partir de zéro. L’étoile marque vos favoris.',
  },
  {
    id: 'manoeuvres-star',
    screen: 'manoeuvres',
    title: 'Manœuvres',
    body: 'L’étoile garde une manœuvre sous vos armes, dans l’Inventaire. Les entrées « Maison » sont celles de votre table, partagées par tous vos personnages.',
  },
  {
    id: 'enchant-source',
    screen: 'enchant',
    title: 'Sort enchanté',
    body: 'Tout le catalogue est proposé : l’enchanteur n’est pas forcément vous. Le sort est noté sur l’objet sans rejoindre votre grimoire.',
  },
];

/** The first tip of `screen` not yet dismissed, or null once all are. */
export function nextTip(screen: TipScreen, seen: ReadonlySet<string>): Tip | null {
  return TIPS.find((t) => t.screen === screen && !seen.has(t.id)) ?? null;
}

/** How many tips `screen` has left, the current one included. */
export function tipsLeft(screen: TipScreen, seen: ReadonlySet<string>): number {
  return TIPS.filter((t) => t.screen === screen && !seen.has(t.id)).length;
}
