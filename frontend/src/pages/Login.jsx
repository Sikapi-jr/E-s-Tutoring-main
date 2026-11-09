import Form from "../components/LoginForm"
import SEOHead from "../components/SEOHead"
import { getSEOData } from "../config/seoConfig"

function Login() {
    const seoData = getSEOData('login')
    //Specifying route we want to send a message to, and specifying that method is "login"
    return (
        <>
            <SEOHead
                title={seoData.title}
                description={seoData.description}
                keywords={seoData.keywords}
                canonical={seoData.canonical}
            />
            <Form route="/api/token/" method="login" />
        </>
    )
}

export default Login