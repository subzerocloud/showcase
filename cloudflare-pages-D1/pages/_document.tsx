import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html className="h-full bg-gray-50">
            <Head />
            <body className="h-full">
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}