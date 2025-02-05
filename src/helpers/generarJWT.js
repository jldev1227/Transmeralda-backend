import jwt from 'jsonwebtoken'

const generatJWT = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
    })
}

export default generatJWT;