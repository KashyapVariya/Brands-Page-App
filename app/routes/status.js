export function getStatusTone(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'success';
    case 'featured':
      return 'attention';
    case 'draft':
      return 'warning';
    default:
      return 'info';
  }
}
