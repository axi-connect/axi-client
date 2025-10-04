'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: { name: string; href: string; description?: string }[];
}

const navItems: NavItem[] = [
  { name: 'Inicio', href: '/' },
  { name: 'Soluciones', href: '/soluciones' },
  { name: 'Marketplace', href: '/marketplace' },
//   { name: 'Talentos', href: '/talentos' },
//   { name: 'Empresas', href: '/empresas' },
  { name: 'Precios', href: '/precios' },
  {
    name: 'Recursos',
    href: '/recursos',
    hasDropdown: true,
    dropdownItems: [
      { name: 'Blog', href: '/blog', description: 'Ideas y actualizaciones' },
      { name: 'Casos de éxito', href: '/casos', description: 'Resultados reales' },
      { name: 'Ayuda', href: '/ayuda', description: 'Guías y soporte' },
    ],
  },
  { name: 'Contacto', href: '/contacto' },
];

const mobileItemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
};

export default function Header1() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerVariants = {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    scrolled: {
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
  };

  const mobileMenuVariants = {
    closed: { opacity: 0, height: 0 },
    open: { opacity: 1, height: 'auto' },
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.header
      className="fixed top-0 right-0 left-0 z-50 transition-all duration-300"
      variants={headerVariants}
      initial="initial"
      animate={isScrolled ? 'scrolled' : 'animate'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        backgroundColor: isScrolled
          ? (theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)')
          : (theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)'),
        boxShadow: isScrolled ? '0 8px 32px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between lg:h-20">
                <motion.div
                    className="flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >   
                    <Link prefetch={false} href="/" className="flex items-center space-x-2">
                        <Image src="https://res.cloudinary.com/dpfnxj52w/image/upload/v1759421795/isotipo_we1obn.png" alt="Axi Connect isotype" width={32} height={32} priority style={{ width: 'auto', height: 'auto' }} />
                        <span className="text-brand-gradient bg-clip-text text-2xl font-bold text-transparent font-heading">
                            axi connect
                        </span>
                    </Link>
                </motion.div>

                <nav className="hidden items-center space-x-8 lg:flex">
                {
                    navItems.map((item) => (
                        <div
                            key={item.name}
                            className="relative"
                            onMouseEnter={() =>
                                item.hasDropdown && setActiveDropdown(item.name)
                            }
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <Link prefetch={false}                  href={item.href}
                                className="text-foreground flex items-center space-x-1 font-medium transition-colors duration-200 hover:text-brand"
                            >
                                <span>{item.name}</span>
                                {item.hasDropdown && (
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                )}
                            </Link>

                            {item.hasDropdown && (
                                <AnimatePresence>
                                {activeDropdown === item.name && (
                                    <motion.div
                                    className="border-border bg-background/95 absolute top-full left-0 mt-2 w-64 overflow-hidden rounded-xl border shadow-xl backdrop-blur-lg"
                                    variants={dropdownVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    transition={{ duration: 0.2 }}
                                    >
                                    {item.dropdownItems?.map((dropdownItem) => (
                                        <Link prefetch={false}                            key={dropdownItem.name}
                                            href={dropdownItem.href}
                                            className="hover:bg-muted hover:text-brand block px-4 py-3 transition-colors duration-200"
                                            >
                                        <div className="text-foreground font-medium">
                                            {dropdownItem.name}
                                        </div>
                                        {dropdownItem.description && (
                                            <div className="text-muted-foreground text-sm">
                                            {dropdownItem.description}
                                            </div>
                                        )}
                                        </Link>
                                    ))}
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            )}
                        </div>
                    ))
                }
                </nav>

                <div className="hidden items-center space-x-4 lg:flex">
                    <Link 
                        prefetch={false}              
                        href="/auth/login"
                        className="text-foreground font-medium transition-colors duration-200 hover:text-brand"
                    >
                        Iniciar sesión
                    </Link>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link prefetch={false}                href="/dashboard"
                        className="inline-flex items-center space-x-2 rounded-full bg-brand-gradient px-6 py-2.5 font-medium text-white transition-all duration-200 hover:shadow-lg"
                        >
                        <span>Comenzar</span>
                        <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </div>

                <motion.button
                    className="hover:bg-muted rounded-lg p-2 transition-colors duration-200 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    whileTap={{ scale: 0.95 }}
                >
                    {isMobileMenuOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </motion.button>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            className="border-border bg-background fixed top-16 right-4 z-50 w-80 overflow-hidden rounded-2xl border shadow-2xl lg:hidden"
                            variants={mobileMenuVariants}
                            initial="closed"
                            animate="open"
                            exit="closed"
                        >
                            <div className="space-y-6 p-6">
                                <div className="space-y-1">
                                     {navItems.map((item) => (
                                         <motion.div key={item.name} variants={mobileItemVariants}>
                                         <Link prefetch={false}                        href={item.href}
                                             className="text-foreground hover:text-brand block rounded-lg px-4 py-3 font-medium transition-colors duration-200"
                                             onClick={() => setIsMobileMenuOpen(false)}
                                         >
                                             {item.name}
                                         </Link>
                                         </motion.div>
                                     ))}
                                </div>

                                <motion.div
                                    className="border-border space-y-3 border-t pt-6"
                                    variants={mobileItemVariants}
                                >
                                     <Link prefetch={false}                    href="/login"
                                         className="text-foreground hover:text-brand block w-full rounded-lg py-3 text-center font-medium transition-colors duration-200"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Iniciar sesión
                                    </Link>
                                     <Link prefetch={false}                    href="/signup"
                                         className="bg-brand-gradient text-white hover:shadow-lg block w-full rounded-lg py-3 text-center font-medium transition-all duration-200"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Comenzar
                                    </Link>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    </motion.header>
  );
}