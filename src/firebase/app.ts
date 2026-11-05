import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from './config';

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
