/** @jest-environment jsdom */
import { fireEvent,render,screen } from "@testing-library/react";
import {z} from "zod";
import {useValidatedForm} from "../use-validated-form";
import type { FormActionState } from "@/lib/validations/form-errors";
const schema=z.object({email:z.string().email("Email chưa đúng"),name:z.string().min(2,"Tên quá ngắn")});
function Form({state}:{state?:FormActionState}){
 const f=useValidatedForm(schema,state);return <form aria-label="demo" {...f.formProps}>
 <input name="email" aria-label="email"/><input name="name" aria-label="name"/>
 {Object.entries(f.errors).map(([k,v])=><span key={k}>{v}</span>)}<p>{f.serverError}</p>
 <button type="submit">Submit</button><button type="button" onClick={()=>f.applyServerError({fieldErrors:{email:"Duplicate"}})}>Error</button></form>;
}
it("validates touched inputs first and the whole form on submit",()=>{
 render(<Form/>);fireEvent.blur(screen.getByLabelText("email"));expect(screen.getByText("Email chưa đúng")).toBeTruthy();expect(screen.queryByText("Tên quá ngắn")).toBeNull();
 fireEvent.submit(screen.getByRole("form"));expect(screen.getByText("Tên quá ngắn")).toBeTruthy();
 fireEvent.change(screen.getByLabelText("email"),{target:{value:"a@b.com"}});expect(screen.queryByText("Email chưa đúng")).toBeNull();
 fireEvent.change(screen.getByLabelText("name"),{target:{value:"Name"}});expect(fireEvent.submit(screen.getByRole("form"))).toBe(true);
});
it("shows server errors then clears them on editing their input",()=>{
 render(<Form state={{error:"Server failed",fieldErrors:{email:"Duplicate"}}}/>);expect(screen.getByText("Duplicate")).toBeTruthy();
 fireEvent.change(screen.getByLabelText("email"),{target:{value:"a@b.com"}});expect(screen.queryByText("Duplicate")).toBeNull();expect(screen.queryByText("Server failed")).toBeNull();
 fireEvent.click(screen.getByText("Error"));expect(screen.getByText("Duplicate")).toBeTruthy();
});
