1. In the appointment table. we can maintain a field scheduledAt which can be updated to track it and We can run a cron job to do this "From when the appointment got created to till its actual date on everyday we can send the remainder once and the job checks the rows in table with pending state and it also knows the scheduledAt" by this we can know till when to send the notification and even the updated dates get tracked and when the appointed is completed we can mark the status in the table as COMPLETED as well and if they miss the appointment we can either extend it or close it based on the input from the clinic's EHR.If they can cancel the appointment then we can send a notification regarding that as well.

2. I do not actually know because I cant think of the requiremrnt this is where I need help 

3. Its appointment this is what I can think of.
 
4. I can think of a queue for doing this thing . An acknowledgement based one so the email sent is confirmed and I can think of clearing the previous days backlogs if they are not sent because as we are sending today the older one from yesterday is not need and is waste

5. In the Notification table itself in a json we can record these and parse the app layer and do the logic part there

6. Then we can have a clinic table maintaining the clinics and we can have a relation between the clinic and appointment table hence we know which clinic it belongs to .


wherenever the job(createNotification) runs and it checks for the appoinment table and then create the notificaiton records and then a job(send notification ) which marks the notification records in a state like queued and once the acknowledgement is done we can mark it as sent . we can also store the logs in each attempt. and track the number of attempts here


REFINED

okay, we start sending the reminders notifications when the appointment is 2 weeks away .we try on 14th day ,7th day and for the last 2 days .I do not know any clinic people so this one is my thought based on a user perspective and I believe by this way we do not bombard the users with notifications

1. OOh , Then I think its like this , we offload it to queue for sending the notifications and the clinic offloads it to us . Then I think if thats the use case then mostly we will be a queue manager ?? and make sure that the emails are sent likewise. so then we can scale up the workers based on the queue length or some algo for it and make sure it is delivered

2. Then its patient and meera has no role I understand but do we even need a record for meera . as per 1. We can have the uses table where the nurses and otehr related users for clinics we can utilise 

3. I do not understand this . We for this case we can direcrly create the notifcation record or will it be a problem 

4. since the new design the number of notificaitons reduced we can remove teh clear backlogs part and send all . Is sent not enough I think as a system of notification manager it is enough to track if the email is send and the email provider will manage the receiving to the person part right ??

5. then are you suggesting to maintain a table for tracking the attempts and the response messages and link it to the notification I thought it as over engineering but if that what is suggest we can do that 


6. I dont understand , aren't they linked with foreign keys ?? thats what I thought and why would it forget it ?? 



After the worker processes the queue job , it will be in a pending queue like thing where one more worker gets the status of the job And I think we can make a promise that this email will be delivered at least once manner so the duplicates even if some happen is not a big issue


REFINED 2

1. I think we can set the offsets ourselves and based on the schedule they give we can send the notifications . If lab results are ready then most probably they want it send immediately or tommorow . so creating a notification is enough and the cron job  will take it from there.

2. Then we can store meera in a patients table and relate her to the clinic and make the record unique comibned (email and clinic)

3. the idemptency thing is understandable and I accept it. I think same key and same body return what we are created , and if same key different body then create a new one 
that is what I can think of

4. I think for V1 we can just sent it and in future we can add a delivered check with webhooks and then we can say to the clinics 

5. understood and i accept the need of the table

6. so for this we should do it in the db side ? hmm interesting 


I understand the problem when you said about the dose email . and the idempotency is the choice . It makes sense to me  


REFINED 3

3. Understand no matter what if the idempotency key is same we do not create a new record

2. okay understood no unique there

4. understood

6. lets see this when I do 


1. we skip them and what are things are possible we send only them and we dont create the notification record immedially the create notifcation job will have logic where it checks the dates and offsets and creates notifcations only if the conditions are met
it is hardcoded just for now and in future I am planning to make this dynamically cofigurable for every clinic with this as the default

and n and N+1 thing I need to look into to it and know what to do for it 


