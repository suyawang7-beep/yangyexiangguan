// User-approved allocation for the 14 images already uploaded to Railway.
// Keep asset IDs stable. Names remain identifiers until edited in the admin UI.
export const TODAY_CARDS=[
  ['LOCK-33','UR'],['LOCK-34','SSR'],['LOCK-35','SSR'],
  ['LOCK-36','SR'],['LOCK-37','SR'],
  ['LOCK-38','R'],['LOCK-39','R'],['LOCK-40','R'],['LOCK-41','R'],
  ['LOCK-42','N'],['LOCK-43','N'],['LOCK-44','N'],['LOCK-45','N'],['LOCK-50','N']
].map(([id,rarity])=>({id,rarity,name:id,unreleased:false}));
