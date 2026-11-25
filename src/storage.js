import { CARS, UPGRADE_TYPES } from './data.js';

const KEY = 'stupid-racing-save-v1';

export function freshSave() {
  const upgrades = {};
  for (const car of CARS) {
    upgrades[car.id] = { engine:0, nitro:0, handling:0, suspension:0, ability:0 };
  }
  return {
    version:1,
    coins:1200,
    gems:15,
    ownedCars:['cart'],
    selectedCar:'cart',
    upgrades,
    skins:['factory'],
    selectedSkin:'factory',
    wheels:'standard',
    stickers:[],
    unlockedMaps:['city'],
    bestTimes:{},
    achievements:[],
    daily:{ date:'', done:false, streak:0 },
    secretActive:false,
    abyssRewardClaimed:false,
    abyssComplete:false,
    races:0,
    bossWins:0,
    totalCoinsEarned:0,
    settings:{ quality:'auto', audio:true, vibration:true }
  };
}

function mergeSave(raw) {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;
  const merged = { ...base, ...raw };
  merged.upgrades = { ...base.upgrades, ...(raw.upgrades || {}) };
  for (const car of CARS) merged.upgrades[car.id] = { ...base.upgrades[car.id], ...(raw.upgrades?.[car.id] || {}) };
  merged.settings = { ...base.settings, ...(raw.settings || {}) };
  merged.ownedCars = Array.isArray(raw.ownedCars) ? raw.ownedCars : ['cart'];
  merged.skins = Array.isArray(raw.skins) ? raw.skins : ['factory'];
  merged.unlockedMaps = Array.isArray(raw.unlockedMaps) ? raw.unlockedMaps : ['city'];
  merged.achievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  if (!merged.ownedCars.includes('cart')) merged.ownedCars.unshift('cart');
  if (!merged.ownedCars.includes(merged.selectedCar)) merged.selectedCar = 'cart';
  if (!merged.skins.includes(merged.selectedSkin)) merged.selectedSkin = 'factory';
  return merged;
}

export function loadSave() {
  try { return mergeSave(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch { return freshSave(); }
}

export function saveGame(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); }
  catch (err) { console.warn('Save failed:', err); }
}

export function upgradeCost(type, level) {
  const item = UPGRADE_TYPES.find(u => u.id === type);
  return item?.costs[level] ?? Infinity;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
