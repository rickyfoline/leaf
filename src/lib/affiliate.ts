// Amazon stores and affiliate tags per country.
// Each country has its own Associates account and tag. Brazil's tag is still a
// placeholder: replace SUA_TAG-20 with the real one before launch. Countries
// covered by the US OneLink can keep `tag: null` until their accounts exist.
import type { Edition } from '@/db/types';

export type AmazonStore = {
  country: string;
  name: string;
  domain: string;
  tag: string | null;
  disclosure: string;
};

const EN_DISCLOSURE = 'As an Amazon Associate, Leaf earns from qualifying purchases.';

export const AMAZON_STORES: Record<string, AmazonStore> = {
  BR: { country: 'BR', name: 'Brasil', domain: 'amazon.com.br', tag: 'SUA_TAG-20', disclosure: 'Como Associado da Amazon, o Leaf ganha com compras qualificadas.' },
  US: { country: 'US', name: 'United States', domain: 'amazon.com', tag: null, disclosure: EN_DISCLOSURE },
  CA: { country: 'CA', name: 'Canada', domain: 'amazon.ca', tag: null, disclosure: EN_DISCLOSURE },
  GB: { country: 'GB', name: 'United Kingdom', domain: 'amazon.co.uk', tag: null, disclosure: EN_DISCLOSURE },
  MX: { country: 'MX', name: 'México', domain: 'amazon.com.mx', tag: null, disclosure: 'Como Afiliado de Amazon, Leaf obtiene ingresos por las compras adscritas.' },
  ES: { country: 'ES', name: 'España', domain: 'amazon.es', tag: null, disclosure: 'Como Afiliado de Amazon, Leaf obtiene ingresos por las compras adscritas.' },
  DE: { country: 'DE', name: 'Deutschland', domain: 'amazon.de', tag: null, disclosure: EN_DISCLOSURE },
  FR: { country: 'FR', name: 'France', domain: 'amazon.fr', tag: null, disclosure: EN_DISCLOSURE },
  IT: { country: 'IT', name: 'Italia', domain: 'amazon.it', tag: null, disclosure: EN_DISCLOSURE },
  JP: { country: 'JP', name: '日本', domain: 'amazon.co.jp', tag: null, disclosure: EN_DISCLOSURE },
  IN: { country: 'IN', name: 'India', domain: 'amazon.in', tag: null, disclosure: EN_DISCLOSURE },
  AU: { country: 'AU', name: 'Australia', domain: 'amazon.com.au', tag: null, disclosure: EN_DISCLOSURE },
};

/** Store for a country; countries without an Amazon store fall back to the US store. */
export const storeFor = (country: string): AmazonStore => AMAZON_STORES[country] ?? AMAZON_STORES.US;

export type BuyLink = { url: string; store: AmazonStore; exact: boolean };

const withTag = (url: string, tag: string | null) => (tag ? `${url}${url.includes('?') ? '&' : '?'}tag=${encodeURIComponent(tag)}` : url);

/**
 * Link to buy a book in the reader's country. Uses the product page when the
 * reader's store sells this exact edition (ASIN), otherwise a store search by
 * ISBN or by title and author, which still carries the affiliate tag.
 */
export function buyLink(opts: { country: string; edition: Edition | null; title: string; author: string }): BuyLink {
  const store = storeFor(opts.country);
  const base = `https://www.${store.domain}`;
  const e = opts.edition;
  if (e && e.asin && e.country === store.country) {
    return { url: withTag(`${base}/dp/${e.asin}`, store.tag), store, exact: true };
  }
  const query = e && e.isbn13 && e.country === store.country ? e.isbn13 : `${opts.title} ${opts.author}`;
  return { url: withTag(`${base}/s?k=${encodeURIComponent(query)}&i=stripbooks`, store.tag), store, exact: false };
}
