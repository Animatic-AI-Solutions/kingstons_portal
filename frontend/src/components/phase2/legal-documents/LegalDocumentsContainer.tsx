/**
 * LegalDocumentsContainer Component
 *
 * Container component for the Legal Documents feature.
 * Orchestrates the table, modals, and API interactions.
 *
 * Features:
 * - Display legal documents in a table using LegalDocumentsTable
 * - Create new documents via CreateLegalDocumentModal
 * - Edit existing documents via LegalDocumentModal
 * - Lapse/Reactivate documents with optimistic updates
 * - Delete documents with confirmation modal
 * - Loading, error, and empty states
 * - Toast notifications for operations
 * - Accessible keyboard navigation
 * - Error boundary for graceful degradation
 *
 * @module components/phase2/legal-documents/LegalDocumentsContainer
 */

import React, { useState, useCallback, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';
import LegalDocumentsTable from './LegalDocumentsTable';
import LegalDocumentModal from './LegalDocumentModal';
import CreateLegalDocumentModal from './CreateLegalDocumentModal';
import { DeleteConfirmationModal } from '@/components/ui';
import {
  useLegalDocuments,
  useUpdateLegalDocumentStatus,
  useDeleteLegalDocument,
} from '@/hooks/useLegalDocuments';
import type { LegalDocument } from '@/types/legalDocument';
import type { ProductOwner } from '@/types/productOwner';

// =============================================================================
// Constants
// =============================================================================

/** Time in ms before ARIA announcements are cleared (allows screen readers to read) */
const ANNOUNCEMENT_CLEAR_DELAY = 3000;

// =============================================================================
// Error Boundary
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

/**
 * Error boundary for graceful degradation when legal documents fail to render
 */
class LegalDocumentsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('LegalDocumentsContainer error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center" role="alert">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">
            Unable to display legal documents. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date string for display in delete confirmation
 */
const formatDateForDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const parsed = parseISO(dateString);
    if (!isValid(parsed)) return '';
    return format(parsed, 'dd/MM/yyyy');
  } catch {
    return '';
  }
};

// =============================================================================
// Types
// =============================================================================

export interface LegalDocumentsContainerProps {
  /** Client group ID for fetching documents */
  clientGroupId: number;
  /** Product owners in this client group (for selection in forms) */
  productOwners: ProductOwner[];
}

// =============================================================================
// Component
// =============================================================================

/**
 * Container component for managing legal documents.
 *
 * Features:
 * - Display legal documents in a sortable table
 * - Create new documents via modal
 * - Edit existing documents
 * - Lapse/Reactivate documents with optimistic updates
 * - Delete documents with confirmation
 * - Error handling with retry capability
 * - Accessible keyboard navigation
 *
 * @param props - Component props
 * @returns The legal documents management interface
 */
const LegalDocumentsContainer: React.FC<LegalDocumentsContainerProps> = ({
  clientGroupId,
  productOwners,
}) => {
  // ============================================================
  // Query Hook - Fetch documents
  // ============================================================
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useLegalDocuments(clientGroupId);

  // ============================================================
  // Mutation Hooks
  // ============================================================
  const updateStatusMutation = useUpdateLegalDocumentStatus();
  const deleteMutation = useDeleteLegalDocument();

  // ============================================================
  // Modal State
  // ============================================================
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<LegalDocument | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ============================================================
  // Row-level Loading State (for status change operations)
  // ============================================================
  const [pendingStatusDocumentId, setPendingStatusDocumentId] = useState<number | null>(null);

  // ============================================================
  // ARIA Status Announcement (with auto-clear)
  // ============================================================
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Set status announcement and auto-clear after delay
   * Clears any existing timeout to prevent stale announcements
   */
  const announceStatus = useCallback((message: string) => {
    // Clear any existing timeout
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    setStatusAnnouncement(message);

    // Auto-clear after delay to prevent stale screen reader content
    announcementTimeoutRef.current = setTimeout(() => {
      setStatusAnnouncement('');
    }, ANNOUNCEMENT_CLEAR_DELAY);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // Event Handlers
  // ============================================================

  /**
   * Open edit modal when a document row is clicked
   */
  const handleRowClick = useCallback((document: LegalDocument) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  }, []);

  /**
   * Close edit modal
   */
  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedDocument(null);
  }, []);

  /**
   * Open create modal
   */
  const handleAdd = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  /**
   * Close create modal
   */
  const handleCreateModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  /**
   * Lapse a document - change status to 'Lapsed'
   * Includes row-level loading indicator
   */
  const handleLapse = useCallback(
    async (document: LegalDocument) => {
      setPendingStatusDocumentId(document.id);
      try {
        await updateStatusMutation.mutateAsync({
          id: document.id,
          status: 'Lapsed',
        });
        toast.success(`${document.type} document lapsed successfully`);
        announceStatus(`${document.type} document has been lapsed`);
      } catch (err) {
        toast.error('Failed to lapse document');
        announceStatus('Failed to lapse document');
      } finally {
        setPendingStatusDocumentId(null);
      }
    },
    [updateStatusMutation, announceStatus]
  );

  /**
   * Reactivate a lapsed document - change status back to 'Signed'
   * Includes row-level loading indicator
   */
  const handleReactivate = useCallback(
    async (document: LegalDocument) => {
      setPendingStatusDocumentId(document.id);
      try {
        await updateStatusMutation.mutateAsync({
          id: document.id,
          status: 'Signed',
        });
        toast.success(`${document.type} document reactivated successfully`);
        announceStatus(`${document.type} document has been reactivated`);
      } catch (err) {
        toast.error('Failed to reactivate document');
        announceStatus('Failed to reactivate document');
      } finally {
        setPendingStatusDocumentId(null);
      }
    },
    [updateStatusMutation, announceStatus]
  );

  /**
   * Open delete confirmation modal
   */
  const handleDelete = useCallback((document: LegalDocument) => {
    setDocumentToDelete(document);
    setIsDeleteModalOpen(true);
  }, []);

  /**
   * Close delete confirmation modal without deleting
   */
  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDocumentToDelete(null);
  }, []);

  /**
   * Confirm and perform the delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!documentToDelete) return;

    try {
      await deleteMutation.mutateAsync(documentToDelete.id);
      toast.success(`${documentToDelete.type} document deleted successfully`);
      announceStatus(`${documentToDelete.type} document has been deleted`);
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      toast.error('Failed to delete document');
      announceStatus('Failed to delete document');
    }
  }, [documentToDelete, deleteMutation, announceStatus]);

  /**
   * Generate specific entity name for delete confirmation
   * Includes document type and date for clear identification
   */
  const getDeleteEntityName = useCallback((): string => {
    if (!documentToDelete) return 'this legal document';

    const dateStr = formatDateForDisplay(documentToDelete.document_date);
    if (dateStr) {
      return `${documentToDelete.type} document dated ${dateStr}`;
    }
    return `${documentToDelete.type} document`;
  }, [documentToDelete]);

  /**
   * Retry fetching documents after error
   */
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // ============================================================
  // Render
  // ============================================================
  return (
    <LegalDocumentsErrorBoundary onRetry={handleRetry}>
      <div data-testid="legal-documents-container">
        {/* Legal Documents Table */}
        <LegalDocumentsTable
          documents={documents || []}
          productOwners={productOwners}
          onRowClick={handleRowClick}
          onLapse={handleLapse}
          onReactivate={handleReactivate}
          onDelete={handleDelete}
          onAdd={handleAdd}
          isLoading={isLoading}
          error={error as Error | null}
          onRetry={handleRetry}
          statusAnnouncement={statusAnnouncement}
          pendingStatusDocumentId={pendingStatusDocumentId}
        />

        {/* Edit Modal - Always mounted for consistent transitions */}
        <LegalDocumentModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          document={selectedDocument}
          productOwners={productOwners}
        />

        {/* Create Modal - Always mounted for consistent transitions */}
        <CreateLegalDocumentModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
          productOwners={productOwners}
        />

        {/* Delete Confirmation Modal with specific document identification */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onCancel={handleDeleteModalClose}
          onConfirm={handleConfirmDelete}
          entityType="legal document"
          entityName={getDeleteEntityName()}
        />
      </div>
    </LegalDocumentsErrorBoundary>
  );
};

export default LegalDocumentsContainer;
