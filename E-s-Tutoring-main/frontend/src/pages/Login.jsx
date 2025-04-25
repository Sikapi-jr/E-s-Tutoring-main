import Form from "../components/LoginForm"

function Login() {
    //Specifying route we want to send a message to, and specifying that method is "login"
    return <Form route="/api/token/" method="login" />
}

export default Login