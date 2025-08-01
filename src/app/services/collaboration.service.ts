import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, combineLatest } from "rxjs";
import { map, filter, distinctUntilChanged } from "rxjs/operators";
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "@angular/fire/firestore";
import { Auth, User } from "@angular/fire/auth";
import { FirebaseService } from "./firebase.service";

export interface CollaborationChange {
  id?: string;
  projectId: string;
  userId: string;
  userName: string;
  changeType: "create" | "update" | "delete";
  targetType: "project" | "section" | "style" | "asset";
  targetId: string;
  changes: any;
  timestamp: any;
  synced: boolean;
}

export interface CollaborationComment {
  id?: string;
  projectId: string;
  userId: string;
  userName: string;
  targetType: "project" | "section" | "element";
  targetId: string;
  content: string;
  position?: { x: number; y: number };
  resolved: boolean;
  timestamp: any;
  replies?: CollaborationComment[];
}

export interface CollaborationCursor {
  userId: string;
  userName: string;
  position: { x: number; y: number };
  color: string;
  timestamp: any;
}

export interface CollaborationSession {
  id?: string;
  projectId: string;
  participants: CollaborationParticipant[];
  isActive: boolean;
  createdAt: any;
  lastActivity: any;
}

export interface CollaborationParticipant {
  userId: string;
  userName: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  isOnline: boolean;
  lastSeen: any;
  cursor?: CollaborationCursor;
}

@Injectable({
  providedIn: "root",
})
export class CollaborationService {
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private activeSession$ = new BehaviorSubject<CollaborationSession | null>(
    null
  );
  private participants$ = new BehaviorSubject<CollaborationParticipant[]>([]);
  private changes$ = new BehaviorSubject<CollaborationChange[]>([]);
  private comments$ = new BehaviorSubject<CollaborationComment[]>([]);
  private cursors$ = new BehaviorSubject<CollaborationCursor[]>([]);

  private changesCollection = "collaboration_changes";
  private commentsCollection = "collaboration_comments";
  private sessionsCollection = "collaboration_sessions";
  private cursorsCollection = "collaboration_cursors";

  private unsubscribeFunctions: (() => void)[] = [];

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private firebaseService: FirebaseService
  ) {
    this.initializeCollaboration();
  }

  /**
   * Initialize collaboration service
   */
  private initializeCollaboration(): void {
    this.firebaseService.getCurrentUser().subscribe((user) => {
      this.currentUser$.next(user);
    });
  }

  /**
   * Start a collaboration session for a project
   */
  startCollaborationSession(
    projectId: string
  ): Observable<CollaborationSession> {
    return new Observable((observer) => {
      this.firebaseService.getCurrentUser().subscribe(async (user) => {
        if (!user) {
          observer.error(new Error("User not authenticated"));
          return;
        }

        try {
          // Create or join collaboration session
          const sessionData: Omit<CollaborationSession, "id"> = {
            projectId,
            participants: [
              {
                userId: user.uid,
                userName: user.displayName || user.email || "Anonymous",
                email: user.email || "",
                role: "owner",
                isOnline: true,
                lastSeen: serverTimestamp(),
              },
            ],
            isActive: true,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
          };

          const docRef = await addDoc(
            collection(this.firestore, this.sessionsCollection),
            sessionData
          );

          // Listen to session updates
          const unsubscribe = onSnapshot(
            doc(this.firestore, this.sessionsCollection, docRef.id),
            (doc) => {
              if (doc.exists()) {
                const session = {
                  id: doc.id,
                  ...doc.data(),
                } as CollaborationSession;
                this.activeSession$.next(session);
                this.participants$.next(session.participants);
                observer.next(session);
              }
            }
          );

          this.unsubscribeFunctions.push(unsubscribe);

          // Start listening to changes and comments
          this.listenToChanges(projectId);
          this.listenToComments(projectId);
          this.listenToCursors(projectId);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Join an existing collaboration session
   */
  joinCollaborationSession(
    sessionId: string
  ): Observable<CollaborationSession> {
    return new Observable((observer) => {
      this.firebaseService.getCurrentUser().subscribe(async (user) => {
        if (!user) {
          observer.error(new Error("User not authenticated"));
          return;
        }

        try {
          // Add user to session participants
          const participant: CollaborationParticipant = {
            userId: user.uid,
            userName: user.displayName || user.email || "Anonymous",
            email: user.email || "",
            role: "editor",
            isOnline: true,
            lastSeen: serverTimestamp(),
          };

          // Update session with new participant
          await updateDoc(
            doc(this.firestore, this.sessionsCollection, sessionId),
            {
              participants: [...this.participants$.value, participant],
              lastActivity: serverTimestamp(),
            }
          );

          // Listen to session updates
          const unsubscribe = onSnapshot(
            doc(this.firestore, this.sessionsCollection, sessionId),
            (doc) => {
              if (doc.exists()) {
                const session = {
                  id: doc.id,
                  ...doc.data(),
                } as CollaborationSession;
                this.activeSession$.next(session);
                this.participants$.next(session.participants);
                observer.next(session);
              }
            }
          );

          this.unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Leave collaboration session
   */
  async leaveCollaborationSession(): Promise<void> {
    const session = this.activeSession$.value;
    const user = this.currentUser$.value;

    if (!session || !user) {
      return;
    }

    try {
      // Remove user from participants
      const updatedParticipants = session.participants.filter(
        (p) => p.userId !== user.uid
      );

      if (updatedParticipants.length === 0) {
        // Delete session if no participants left
        await deleteDoc(
          doc(this.firestore, this.sessionsCollection, session.id!)
        );
      } else {
        // Update session
        await updateDoc(
          doc(this.firestore, this.sessionsCollection, session.id!),
          {
            participants: updatedParticipants,
            lastActivity: serverTimestamp(),
          }
        );
      }

      // Clean up subscriptions
      this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      this.unsubscribeFunctions = [];

      // Reset state
      this.activeSession$.next(null);
      this.participants$.next([]);
      this.changes$.next([]);
      this.comments$.next([]);
      this.cursors$.next([]);
    } catch (error) {
      console.error("Error leaving collaboration session:", error);
    }
  }

  /**
   * Record a change for collaboration
   */
  async recordChange(
    projectId: string,
    changeType: "create" | "update" | "delete",
    targetType: "project" | "section" | "style" | "asset",
    targetId: string,
    changes: any
  ): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) {
      return;
    }

    try {
      const changeData: Omit<CollaborationChange, "id"> = {
        projectId,
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        changeType,
        targetType,
        targetId,
        changes,
        timestamp: serverTimestamp(),
        synced: true,
      };

      await addDoc(
        collection(this.firestore, this.changesCollection),
        changeData
      );
    } catch (error) {
      console.error("Error recording change:", error);
    }
  }

  /**
   * Add a comment
   */
  async addComment(
    projectId: string,
    targetType: "project" | "section" | "element",
    targetId: string,
    content: string,
    position?: { x: number; y: number }
  ): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const commentData: Omit<CollaborationComment, "id"> = {
        projectId,
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        targetType,
        targetId,
        content,
        position,
        resolved: false,
        timestamp: serverTimestamp(),
        replies: [],
      };

      await addDoc(
        collection(this.firestore, this.commentsCollection),
        commentData
      );
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, content: string): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const reply: CollaborationComment = {
        projectId: "", // Will be set from parent comment
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        targetType: "element",
        targetId: "",
        content,
        resolved: false,
        timestamp: serverTimestamp(),
      };

      // Get current comment and add reply
      const currentComments = this.comments$.value;
      const commentIndex = currentComments.findIndex((c) => c.id === commentId);

      if (commentIndex !== -1) {
        const updatedComment = { ...currentComments[commentIndex] };
        updatedComment.replies = [...(updatedComment.replies || []), reply];

        await updateDoc(
          doc(this.firestore, this.commentsCollection, commentId),
          {
            replies: updatedComment.replies,
          }
        );
      }
    } catch (error) {
      console.error("Error replying to comment:", error);
      throw error;
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, this.commentsCollection, commentId), {
        resolved: true,
      });
    } catch (error) {
      console.error("Error resolving comment:", error);
      throw error;
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(
    projectId: string,
    position: { x: number; y: number }
  ): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) {
      return;
    }

    const cursorData: CollaborationCursor = {
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
      position,
      color: this.getUserColor(user.uid),
      timestamp: serverTimestamp(),
    };

    try {
      // Use user ID as document ID for cursors
      await updateDoc(
        doc(this.firestore, this.cursorsCollection, `${projectId}_${user.uid}`),
        {
          ...(cursorData as any),
        }
      );
    } catch (error) {
      // Document might not exist, create it
      try {
        const docData = {
          id: `${projectId}_${user.uid}`,
          ...(cursorData as any),
        };
        await addDoc(
          collection(this.firestore, this.cursorsCollection),
          docData
        );
      } catch (createError) {
        console.error("Error updating cursor:", createError);
      }
    }
  }

  /**
   * Listen to collaboration changes
   */
  private listenToChanges(projectId: string): void {
    const q = query(
      collection(this.firestore, this.changesCollection),
      where("projectId", "==", projectId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const changes: CollaborationChange[] = [];
      querySnapshot.forEach((doc) => {
        changes.push({ id: doc.id, ...doc.data() } as CollaborationChange);
      });
      this.changes$.next(changes);
    });

    this.unsubscribeFunctions.push(unsubscribe);
  }

  /**
   * Listen to collaboration comments
   */
  private listenToComments(projectId: string): void {
    const q = query(
      collection(this.firestore, this.commentsCollection),
      where("projectId", "==", projectId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const comments: CollaborationComment[] = [];
      querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() } as CollaborationComment);
      });
      this.comments$.next(comments);
    });

    this.unsubscribeFunctions.push(unsubscribe);
  }

  /**
   * Listen to collaboration cursors
   */
  private listenToCursors(projectId: string): void {
    const q = query(
      collection(this.firestore, this.cursorsCollection),
      where("id", ">=", `${projectId}_`),
      where("id", "<", `${projectId}_\uf8ff`)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const cursors: CollaborationCursor[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as CollaborationCursor;
        // Filter out current user's cursor
        if (data.userId !== this.currentUser$.value?.uid) {
          cursors.push(data);
        }
      });
      this.cursors$.next(cursors);
    });

    this.unsubscribeFunctions.push(unsubscribe);
  }

  /**
   * Get user color for cursor/changes
   */
  private getUserColor(userId: string): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Get active collaboration session
   */
  getActiveSession(): Observable<CollaborationSession | null> {
    return this.activeSession$.asObservable();
  }

  /**
   * Get collaboration participants
   */
  getParticipants(): Observable<CollaborationParticipant[]> {
    return this.participants$.asObservable();
  }

  /**
   * Get collaboration changes
   */
  getChanges(): Observable<CollaborationChange[]> {
    return this.changes$.asObservable();
  }

  /**
   * Get collaboration comments
   */
  getComments(): Observable<CollaborationComment[]> {
    return this.comments$.asObservable();
  }

  /**
   * Get collaboration cursors
   */
  getCursors(): Observable<CollaborationCursor[]> {
    return this.cursors$.asObservable();
  }

  /**
   * Get comments for a specific target
   */
  getCommentsForTarget(
    targetType: string,
    targetId: string
  ): Observable<CollaborationComment[]> {
    return this.comments$.pipe(
      map((comments) =>
        comments.filter(
          (c) => c.targetType === targetType && c.targetId === targetId
        )
      ),
      distinctUntilChanged()
    );
  }

  /**
   * Get unresolved comments count
   */
  getUnresolvedCommentsCount(): Observable<number> {
    return this.comments$.pipe(
      map((comments) => comments.filter((c) => !c.resolved).length),
      distinctUntilChanged()
    );
  }

  /**
   * Check if user can edit (has write permissions)
   */
  canEdit(): Observable<boolean> {
    return combineLatest([this.currentUser$, this.participants$]).pipe(
      map(([user, participants]) => {
        if (!user) return false;
        const participant = participants.find((p) => p.userId === user.uid);
        return participant?.role === "owner" || participant?.role === "editor";
      }),
      distinctUntilChanged()
    );
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.leaveCollaborationSession();
  }
}
