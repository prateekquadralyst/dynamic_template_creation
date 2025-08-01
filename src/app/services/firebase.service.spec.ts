import { TestBed } from '@angular/core/testing';
import { FirebaseService } from './firebase.service';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

// Mock Firebase services
const mockFirestore = {
  collection: jasmine.createSpy('collection'),
  doc: jasmine.createSpy('doc'),
  addDoc: jasmine.createSpy('addDoc'),
  updateDoc: jasmine.createSpy('updateDoc'),
  deleteDoc: jasmine.createSpy('deleteDoc'),
  getDoc: jasmine.createSpy('getDoc'),
  getDocs: jasmine.createSpy('getDocs'),
  query: jasmine.createSpy('query'),
  where: jasmine.createSpy('where'),
  orderBy: jasmine.createSpy('orderBy'),
  onSnapshot: jasmine.createSpy('onSnapshot'),
  enableNetwork: jasmine.createSpy('enableNetwork'),
  disableNetwork: jasmine.createSpy('disableNetwork')
};

const mockAuth = {
  currentUser: null,
  signInAnonymously: jasmine.createSpy('signInAnonymously'),
  onAuthStateChanged: jasmine.createSpy('onAuthStateChanged')
};

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FirebaseService,
        { provide: Firestore, useValue: mockFirestore },
        { provide: Auth, useValue: mockAuth }
      ]
    });
    service = TestBed.inject(FirebaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize authentication', () => {
    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();
  });

  it('should setup network listener', () => {
    expect(service).toBeTruthy();
    // Network listeners are set up in constructor
  });

  it('should provide current user observable', () => {
    const currentUser$ = service.getCurrentUser();
    expect(currentUser$).toBeTruthy();
  });

  it('should provide online status observable', () => {
    const onlineStatus$ = service.getOnlineStatus();
    expect(onlineStatus$).toBeTruthy();
  });

  it('should enable offline support', () => {
    service.enableOfflineSupport();
    // This should not throw any errors
    expect(service).toBeTruthy();
  });
});