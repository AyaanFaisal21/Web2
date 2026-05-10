import React from "react"
import type {Metadata} from 'next'
import {Geist, Geist_Mono, Cormorant_Garamond, Sulphur_Point, Gideon_Roman, Georama, Italiana} from 'next/font/google'
import {Analytics} from '@vercel/analytics/next'
import './globals.css'
import { FloatingPathsBackground } from "@/components/floating-paths-background";
import {HeroHeader} from "@/components/header";

const _geist = Geist({subsets: ["latin"]});
const _geistMono = Geist_Mono({subsets: ["latin"]});
const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-elegant"
});
const sulphurPoint = Sulphur_Point({
    subsets: ["latin"],
    weight: ["300", "400", "700"],
    variable: "--font-name"
});
const gideonRoman = Gideon_Roman({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-gideon"
});
const georama = Georama({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-georama"
});
const italiana = Italiana({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-italiana"
});

export const metadata: Metadata = {
    metadataBase: new URL('https://ayaan-faisal.com'),
    title: 'Ayaan Faisal — Software Engineer Portfolio',
    description: 'Riding the intelligent-tech wave',
    generator: 'v0.app',
    openGraph: {
        title: 'Ayaan Faisal — Software Engineer Portfolio',
        description: 'Riding the intelligent-tech wave',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Ayaan Faisal — Software Engineer Portfolio',
        description: 'Riding the intelligent-tech wave',
        images: ['/og-image.png'],
    },
    icons: {
        icon: [
            {
                url: '/icon-light-32x32.png',
                media: '(prefers-color-scheme: light)',
            },
            {
                url: '/icon-dark-32x32.png',
                media: '(prefers-color-scheme: dark)',
            },
            {
                url: '/icon-light-32x32.png',
                type: 'image/png',
            },
        ],
        apple: '/apple-icon.png',
    },
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="dark">
        <body className={`font-sans antialiased ${cormorant.variable} ${sulphurPoint.variable} ${gideonRoman.variable} ${georama.variable} ${italiana.variable}`}>
        <div className='fixed inset-0 z-0'>
            <FloatingPathsBackground/>
        </div>
        <HeroHeader/>
        <div className='relative z-10'>
            {children}
        </div>
        <Analytics/>
        </body>
        </html>
    )
}
