interface FetcherResult {
    first: number
    last: number
    total: number
    rows: any
}
export async function fetcher(url: string, options ?: any):Promise<FetcherResult> {
    return await fetch(url, options).then(async (res) => {
        const { first, last, total } = parseRangeHeader(res.headers.get('Content-Range') || '')
        const rows = await res.json()
        return { first, last, total, rows }
    })
}
function parseRangeHeader(header: string) {
    const parts = header.split('/')
    const total = parts[1] ? parseInt(parts[1], 10) : 0
    const range = parts[0].split('-')
    const first = range[0] ? parseInt(range[0], 10) : 0
    const last = range[1] ? parseInt(range[1], 10) : 0
    return { first, last, total }
}