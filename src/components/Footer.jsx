import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-4 px-6 text-center text-sm text-gray-600 mt-auto fixed bottom-0 right-0">
      <div className="max-w-7xl mx-auto">
        <p>
          Background design by{' '}
          <Link 
            href="https://www.omaralbeik.com/gallery/taha-114" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-gray-900"
          >
            Omar Albeik's Gallery
          </Link>
          {' '}- "وقل رب زدني علماً" (And pray, "My Lord! Increase me in knowledge") - Taha, 114
        </p>
      </div>
    </footer>
  );
}