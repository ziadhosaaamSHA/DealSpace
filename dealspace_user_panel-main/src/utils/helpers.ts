export const BASE_URL: string = 'http://127.0.0.1:8000/api';
export const ASSETS_URL: string = 'http://127.0.0.1:8000';

export const generatePageNumbers = (page: number, totalPages: number) => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const pages = [];
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
};

export const getInitials = (name:string) => {
    if (!name) return '';
  
    const parts = name.trim().split(' ');
    
    if (parts.length >= 2) {
      // Return first letter of first and second name
      return parts[0][0]?.toUpperCase() + parts[1][0]?.toUpperCase();
    } else {
      // Return first two letters of the single name
      return name.substring(0, 2).toUpperCase();
    }
  };