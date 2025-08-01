import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator
} from '@angular/fire/firestore';
import { 
  Auth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User 
} from '@angular/fire/auth';
import { Observable, BehaviorSubject, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Project } from '../models/project.interface';

export interface FirebaseProject extends Omit<Project, 'createdAt' | 'updatedAt'> {
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  userId: string; // Owner of the project
  isShared: boolean;
  sharedWith: string[]; // Array of user IDs who have access
}

export interface ProjectShare {
  id?: string;
  projectId: string;
  ownerId: string;
  sharedWithId: string;
  permission: 'read' | 'write';
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  private projectsCollection = 'projects';
  private sharesCollection = 'project_shares';

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.initializeAuth();
    this.setupNetworkListener();
  }

  /**
   * Initialize authentication
   */
  private initializeAuth(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser$.next(user);
      if (!user) {
        // Sign in anonymously if no user
        signInAnonymously(this.auth).catch(error => {
          console.error('Anonymous sign-in failed:', error);
        });
      }
    });
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      enableNetwork(this.firestore);
    });

    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
      disableNetwork(this.firestore);
    });
  }

  /**
   * Get current user observable
   */
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  /**
   * Get online status observable
   */
  getOnlineStatus(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  /**
   * Create a new project in Firebase
   */
  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const firebaseProject: Omit<FirebaseProject, 'id'> = {
          ...project,
          userId: user.uid,
          isShared: false,
          sharedWith: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        return from(addDoc(collection(this.firestore, this.projectsCollection), firebaseProject));
      }),
      switchMap(docRef => this.getProject(docRef.id)),
      catchError(error => {
        console.error('Error creating project:', error);
        return throwError(() => new Error('Failed to create project'));
      })
    );
  }

  /**
   * Get a project by ID
   */
  getProject(id: string): Observable<Project> {
    return from(getDoc(doc(this.firestore, this.projectsCollection, id))).pipe(
      map(docSnapshot => {
        if (!docSnapshot.exists()) {
          throw new Error('Project not found');
        }
        
        const data = docSnapshot.data() as FirebaseProject;
        return this.convertFirebaseProject(data, docSnapshot.id);
      }),
      catchError(error => {
        console.error('Error getting project:', error);
        return throwError(() => new Error('Failed to get project'));
      })
    );
  }

  /**
   * Get all projects for the current user
   */
  getUserProjects(): Observable<Project[]> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const q = query(
          collection(this.firestore, this.projectsCollection),
          where('userId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );

        return from(getDocs(q));
      }),
      map(querySnapshot => {
        const projects: Project[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data() as FirebaseProject;
          projects.push(this.convertFirebaseProject(data, doc.id));
        });
        return projects;
      }),
      catchError(error => {
        console.error('Error getting user projects:', error);
        return throwError(() => new Error('Failed to get projects'));
      })
    );
  }

  /**
   * Get shared projects for the current user
   */
  getSharedProjects(): Observable<Project[]> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const q = query(
          collection(this.firestore, this.projectsCollection),
          where('sharedWith', 'array-contains', user.uid),
          orderBy('updatedAt', 'desc')
        );

        return from(getDocs(q));
      }),
      map(querySnapshot => {
        const projects: Project[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data() as FirebaseProject;
          projects.push(this.convertFirebaseProject(data, doc.id));
        });
        return projects;
      }),
      catchError(error => {
        console.error('Error getting shared projects:', error);
        return throwError(() => new Error('Failed to get shared projects'));
      })
    );
  }

  /**
   * Update a project
   */
  updateProject(id: string, updates: Partial<Project>): Observable<Project> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const updateData = {
          ...updates,
          updatedAt: new Date()
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });

        return from(updateDoc(doc(this.firestore, this.projectsCollection, id), updateData));
      }),
      switchMap(() => this.getProject(id)),
      catchError(error => {
        console.error('Error updating project:', error);
        return throwError(() => new Error('Failed to update project'));
      })
    );
  }

  /**
   * Delete a project
   */
  deleteProject(id: string): Observable<void> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        return from(deleteDoc(doc(this.firestore, this.projectsCollection, id)));
      }),
      catchError(error => {
        console.error('Error deleting project:', error);
        return throwError(() => new Error('Failed to delete project'));
      })
    );
  }

  /**
   * Share a project with another user
   */
  shareProject(projectId: string, userEmail: string, permission: 'read' | 'write' = 'read'): Observable<void> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        // In a real implementation, you would look up the user by email
        // For now, we'll use a placeholder user ID
        const shareData: Omit<ProjectShare, 'id'> = {
          projectId,
          ownerId: user.uid,
          sharedWithId: userEmail, // In real implementation, this would be the user ID
          permission,
          createdAt: new Date()
        };

        return from(addDoc(collection(this.firestore, this.sharesCollection), shareData));
      }),
      switchMap(() => {
        // Update the project to add the shared user
        return from(updateDoc(doc(this.firestore, this.projectsCollection, projectId), {
          isShared: true,
          sharedWith: [userEmail] // In real implementation, this would be user IDs
        }));
      }),
      catchError(error => {
        console.error('Error sharing project:', error);
        return throwError(() => new Error('Failed to share project'));
      })
    );
  }

  /**
   * Remove project sharing
   */
  unshareProject(projectId: string, userEmail: string): Observable<void> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        // Get current project data
        return this.getProject(projectId);
      }),
      switchMap(project => {
        const updatedSharedWith = project.collaborators?.map(c => c.email).filter(email => email !== userEmail) || [];
        
        return from(updateDoc(doc(this.firestore, this.projectsCollection, projectId), {
          isShared: updatedSharedWith.length > 0,
          sharedWith: updatedSharedWith
        }));
      }),
      catchError(error => {
        console.error('Error unsharing project:', error);
        return throwError(() => new Error('Failed to unshare project'));
      })
    );
  }

  /**
   * Listen to real-time project updates
   */
  listenToProject(id: string): Observable<Project> {
    return new Observable(observer => {
      const unsubscribe = onSnapshot(
        doc(this.firestore, this.projectsCollection, id),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as FirebaseProject;
            const project = this.convertFirebaseProject(data, docSnapshot.id);
            observer.next(project);
          } else {
            observer.error(new Error('Project not found'));
          }
        },
        (error) => {
          console.error('Error listening to project:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  /**
   * Listen to real-time projects updates
   */
  listenToUserProjects(): Observable<Project[]> {
    return this.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        return new Observable<Project[]>(observer => {
          const q = query(
            collection(this.firestore, this.projectsCollection),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc')
          );

          const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
              const projects: Project[] = [];
              querySnapshot.forEach(doc => {
                const data = doc.data() as FirebaseProject;
                projects.push(this.convertFirebaseProject(data, doc.id));
              });
              observer.next(projects);
            },
            (error) => {
              console.error('Error listening to projects:', error);
              observer.error(error);
            }
          );

          return () => unsubscribe();
        });
      })
    );
  }

  /**
   * Search projects by name or description
   */
  searchProjects(query: string): Observable<Project[]> {
    return this.getUserProjects().pipe(
      map(projects => {
        const lowercaseQuery = query.toLowerCase();
        return projects.filter(project => 
          project.name.toLowerCase().includes(lowercaseQuery) ||
          project.description.toLowerCase().includes(lowercaseQuery)
        );
      })
    );
  }

  /**
   * Convert Firebase project to Project interface
   */
  private convertFirebaseProject(firebaseProject: FirebaseProject, id: string): Project {
    return {
      ...firebaseProject,
      id,
      createdAt: firebaseProject.createdAt?.toDate ? firebaseProject.createdAt.toDate() : new Date(firebaseProject.createdAt),
      updatedAt: firebaseProject.updatedAt?.toDate ? firebaseProject.updatedAt.toDate() : new Date(firebaseProject.updatedAt)
    };
  }

  /**
   * Enable offline persistence
   */
  enableOfflineSupport(): void {
    // Offline persistence is enabled by default in Firebase v9+
    // This method is kept for compatibility and future enhancements
    console.log('Offline support is enabled by default');
  }

  /**
   * Sync offline changes when coming back online
   */
  syncOfflineChanges(): Observable<void> {
    return this.getOnlineStatus().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return from(enableNetwork(this.firestore));
        } else {
          return from(disableNetwork(this.firestore));
        }
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error syncing offline changes:', error);
        return throwError(() => new Error('Failed to sync offline changes'));
      })
    );
  }
}