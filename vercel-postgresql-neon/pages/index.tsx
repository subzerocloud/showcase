import type { NextPage } from 'next'
import ReactMarkdown from 'react-markdown'
import readme from '../README.md'
const Home: NextPage = () => {
    return (
        <div className="px-8 mt-5">
            <article className="prose prose-slate">
            <ReactMarkdown
                children={readme}
                />
            </article>
        </div>
    );
}
export default Home