# CareSignal — Design

> Status: draft. Written before implementation; expected to change once code exists.
> Revisions belong in §7, not silently in place.

---

## 1. Scope

**What it is**

<!-- One paragraph. What does a clinic get by calling this? -->

**Who calls it, and how they authenticate**

<!-- Which systems, which humans. Who never touches it. -->

**In scope for v1**

<!-- 4-6 bullets -->

**Explicitly NOT in scope**

<!-- The section that protects the 12 weeks. Write it before you need it. -->

---

## 2. Actors and entities

<!--
One line each: what it is, and who owns the fact.
For every entity ask: does CareSignal own this, or does the clinic's EHR?
-->

| Entity | What it is | Owner |
| --- | --- | --- |
|  |  |  |

---

## 3. Notification lifecycle

**States**

<!-- Name each one. What is true of a notification in this state? -->

NOTIFICATION REQUEST:
SUBMITTED --> Request raised by the clinic for sending notification to patient

COMPLETED --> Successfully sent the all notifications to the patient based on the offset.

PARTIAL_COMPLETED --> Only a part of the offset got sent and the others are not .

FAILED --> when all the offsets are over and none of them sent to the patient

CANCELLED --> Clinic cancelled the request.

NOTIFICATION TABLE:
QUEUED -->  A notification in this state is one that is created by the job based on the offset set for the notification request by the clinic or the default offset.Failed notifications move to the QUEUED state again with the number of attempts incremented and the failure log stored .

PROCESSING --> A notification in this state is one that is taken by a worker for sending them(only one worker can process this and the logic is already derived).

SENT --> A notification in this state is one that is sent by the provider(we do not yet know that the patient received it but the sending part is done ).

FAILED --> A notification in this state is one that is failed to send by the provider (after the retry attempts ). non - retryable failures go straight to FAILED, retryable requeue with backoff based on the response from the provider

CANCELLED --> clinic cancelled the request where the notification is already created and when the status transition happens in request table we update the related offsets that are not yet sent and in queued state



**Transitions**

<!-- For each: from → to, what triggers it, who performs it. -->

| From | To | Trigger | Actor |
| --- | --- | --- | --- |
|  |  |  |  |
NOTIFICATION REQUEST:

SUBMITTED -> COMPLETED ---> when the worker sends the notifications and updates the notification table we also check notification request and if all the offsets are sent out if yes we update the status to COMPLETED in the request table

SUBMITTED --> PARTIAL_COMPLETED ---->  when the worker sends the notifications and updates the notification table we also check notification request and if all the offsets are sent out if only a few (2 out 3 ) is sent we mark it as PARTIAL_COMPLETED and if 1 sent 2 failed still we mark it in this state

SUBMITTED --> FAILED ------->  when the worker sends the notifications and updates the notification table we also check notification request and if all the offsets are sent out if none of the sent and all are failed in the notification then we mark it as failed 

SUBMITTED --> CANCELLED ------> when the clinic updates the request to cancelled we update the notifications request and the notifications that are queued as well.



NOTIFICATION TABLE:

QUEUED --> PROCESSING ----> when the worker takes a job it first updates the queued job to processing and then proceeds to send the notification and the related works on its side so no 2 jobs take the same job and double send the email.

QUEUED --> CANCELLED ----> when the clinic updates the request to cancelled we update the notifications request and the notifications that are queued as well.

PROCESSING --> SENT ----> when the worker send the notifcaiton and receives the ok from the provider we update the notificaiton created for this offset as sent.

PROCESSING --> QUEUED ----> when the worker tries to send the notification and fails it the failure is a retryable failure then the the number of attempts is incremented and the logs are storeed and then the state is moved back to the queued state.
Future implementation requries proper planning and implementation of retry with backoff + jitter 

PROCESSING --> FAILED ----> when the worker receives a non-retryable failure than we move the notificaition to failed state and also when all the attempts are over and still not sent in the last attempt then also it is failed.






**Illegal transitions**

<!-- State these explicitly. Especially: what cannot happen once sending has begun. -->
COMPLETED --> CANCELLED   
PARTIAL_COMPLETED --> CANCELLED
FAILED --> CANCELLED
these 3 cannot happen as there is nothing to stop 


**Re-checked immediately before calling the provider**

<!-- The DB is the truth, the queue is only a trigger. What does the worker verify? -->

---

## 4. API contract

### POST /v1/notification-requests

<!-- Request body. Headers. -->
- patient info(name , email , phonenumber)
- targetDate
- isDefualtOffset: boolean
- offset array [] (if isDefaultOffset is false ) | null
- in request header we set the idempotecy key as well 
<!-- Responses: success, and every error case including:
     - same idempotency key + same body
     - same idempotency key + different body
     - target date already past some offsets -->
     - success response: status code 201 and then the message - notification request created successfully
     data - the created whole record for the frontend to use for UI
     - same idempotency key + same body --> 201  +  notification request created successfully+
          the created whole record for the frontend to use for UI
     - error messsages 
          - same idempotency key + different body --> 400 bad request message idempotency key already exists
          - if they choose custom offest dates and the all the dates already passed then --> 400 bad request with message already past the requested notification offset date 

### DELETE /v1/notification-requests/:id  (cancel)

<!-- What is legal to cancel, in which states. What is returned when it is not. -->
when the notification request is in SUBMITTED state the cancellation can be done 
sucess: return 200 and return the whole record for the frontend to use for UI + message: cancellation done successfully

when the status is COMPLETED,PARTIAL_COMPLETED,CANCELLED, FAILED we return no active notificaitions to cancel


### GET /v1/notification-requests/:id  (status)

<!-- What can a clinic see? Attempts? Errors? Recipient details? -->

the current status , patient info , related notification errors if failed with each attempt as rows
sent_at based on the notificaitonlogtable created_at field, if in submitted status we get the related notification records and the show what has sent till now and if no we send null and the fronted gets it as no offset is reached yet


---

## 5. Access patterns

<!--
The literal queries this system runs. Five or six.
Written BEFORE the schema, so indexes are derived rather than guessed.
-->

1.when the job runs it filters the notification request table for submitted status ones and the offset of them which is equal to the current date and creates the notification records .
2.when the other job runs it filters the Queued status and the next_attempt_at if exists in the notification table then check if now time is >=next_attempt_at (first updates to processing and then gets it ) and then the records are pushed it to the queue implemented for the workers to take it from there. 
3.The workers does its job and then if it is sent or non retryable failure it is updated to failed from the worker.The retryable ones are moved back to the Queued status.
4.when the clinic wants to check about the request they made we just lookup the notification request table with clinic_id and request_id and if it is completed or failed or we send their status and filter the notification table with the req id to get those details and send them as well.  
5.when the clinic wants to cancel the request made , we select the request and related Queued notification records and then update them to cancelled. Decision to be made on the race condition between clinic cancellation and worker processing the job and if the workers starts processing should it double check right before calling the provider for status is processing and not cancelled(DECISION TO BE MADE during implementation ).  

---

## 6. Schema

<!--
DDL. Every index carries a comment naming which query in §5 it serves.
Every table that holds tenant data: how is isolation enforced?
-->

```sql


```

---

## 7. Decisions log

<!--
Decision + reason, in your own words, 2-3 sentences each.
Include the things you deliberately cut — future-you needs to know they were choices.
If one will not come out without scrolling back through a chat log, that is a gap.
-->

- **Whether CareSignal stores appointments** —
No it just stores the notification request , since our system is more of a notification manager , managing appointments in here is duplicacy in work between clinics and our system . So it is not needed to store apoointments.

- **Patients vs. users as separate entities** —
Patients are the ones who receive notification from our system and does not have any role to access our system other than just receiving the notifications we send to them. Whereas users are clinic related entities like nurses , doctors etc... where these come to access our system for data of the notifications sent and to whom , dashboards etc..

- **Reminder offsets: values, who computes them, hardcoded vs. configurable** —
offset configurations is a table where we have relation with notification request and we store the offsets for a single request , in the application layer we provide the default one as [14,7,2,1,0] and the clinics can override it in their UI when creating a notification request to our system . 
Offset config with isActive + unique(reqID, offset) — that works, and it's a clean fix. Deactivating instead of deleting also means you keep a record that a clinic changed their mind, which you'll want for the "why didn't Meera get the T-2" question later.


- **Lazy vs. upfront notification creation** —
lazy notification is the choice I make because we do not have the overhead of managing the upfront notifications created if the clinic cancels the request to send notifications and also this provides the dynamicity to change offsets of requests if the clinics want it to.And cancellation lives in the request

- **Idempotency: same key + same body; same key + different body** —
We store the idempotency key + response body in table and return the body when a new request comes with the same idempotency key.
If same key appears we return the appropriate status and with the data of the key that already managed to create the request so the users feel the request is created (actually it did but not from their retry but from the original request)
if the reqeuest comes with the asame key + same body then return ok from the table and if the key is same with a different body then reject with the message the key exits already likwies

- **What `sent` means, and why delivery webhooks are cut from v1** —
we are managing only if the request is sent that part in the initial implementation and once all the working features are completed the isDelivered part will also be taken care of.

- **Attempts as rows rather than a JSON column** —
these should not be mutable so since the number of attempts is prefined (3 with backoffs) we store the result in an individual field rather than json ,since in json it involves in updating the same field overriding it. two workers reading the same JSON array, both appending, one write clobbering the other.

- **Tenant isolation: FK plus RLS, and why the FK alone is not enough** —
we need to create a policy in the db side to stop a clinic from exploiting another clinics notification requests . FK guarentees only to fetch related records without messing it up but when ID is exploited it cannot do anything 

- **Channel deferred out of the unique constraint** —
 v1 is email-only, so (notification_request_id, offset) is sufficient: one request, one offset, one row. The day SMS is added, the same request + same offset legitimately needs two rows (one per channel), so the constraint becomes (notification_request_id, offset, channel). Deferred deliberately rather than added now, because v1 has no channel column to put in it.

- **What makes a duplicate send harmless** —
when sending the request to the provider we attach a idempotency key and hence if we retry and the email is already sent means the provider does not send again 
And 2 worker case 
 we should update hte request whose status is queued to processing likewise but whne getting the request we dont just get the request we combine hte query like where id =1 and status is still queued likewise so if already a worker did take the job it will be in processing status by now
