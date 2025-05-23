import mongoose,{ Schema } from "mongoose";
i

const subscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})


export const subscription = mongoose.model("Subscription",subscriptionSchema)