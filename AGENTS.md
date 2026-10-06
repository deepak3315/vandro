<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Website architecture
- Use dedicated TanStack file routes for each content section and shared site layout components to keep navigation and branding consistent.
- Keep service, industry, and editorial content in a browser-safe shared module so pages use one source of truth.
- Contact channels and vacancies remain explicit pending-information states until verified company details are provided; never fabricate them.
- Serve generated video and uploaded logo through asset pointers; bundle generated supporting photographs through ES module imports.
