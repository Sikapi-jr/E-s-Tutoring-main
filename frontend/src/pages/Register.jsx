import Form from "../components/RegisterForm"
import SEOHead from "../components/SEOHead"
import { getSEOData } from "../config/seoConfig"

function Register() {
    const seoData = getSEOData('register')
    return (
        <>
            <SEOHead
                title={seoData.title}
                description={seoData.description}
                keywords={seoData.keywords}
                canonical={seoData.canonical}
            />
            <Form route="/api/user/register/" method="register" />
        </>
    )
}
export default Register